"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import PatternLock from "../../../../components/PatternLock";

export default function SoumettreAppareilDirectPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);
  const [patternValue, setPatternValue] = useState("");
  const [submittedTickets, setSubmittedTickets] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setPhotos((prev) => [...prev, ...valid]);
    setPhotoPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };
  const [formData, setFormData] = useState({
    device: "",
    issue: "",
    imei: "",
    unlock_code: "",
    unlock_pattern: "",
    description: "",
    broken_parts: "",
    oxidation: false,
    screen_broken: false,
    back_broken: false,
    missing_parts: "",
  });

  useEffect(() => {
    if (token) {
      loadClientFromToken();
    }
  }, [token]);

  const loadClientFromToken = async () => {
    setLoading(true);
    try {
      // Chercher le token dans la table client_qr_tokens
      const { data: tokenData, error: tokenError } = await supabase
        .from("client_qr_tokens")
        .select("client_id")
        .eq("token", token)
        .eq("is_active", true)
        .single();

      if (tokenError || !tokenData) {
        console.error("Token error:", tokenError);
        setError("Lien invalide. Veuillez contacter votre réparateur.");
        setLoading(false);
        return;
      }

      // Récupérer le client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", tokenData.client_id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);
    } catch (err) {
      console.error("Erreur:", err);
      setError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handlePatternComplete = (pattern) => {
    const patternStr = pattern.join("-");
    setPatternValue(patternStr);
    setFormData((prev) => ({ ...prev, unlock_pattern: patternStr }));
  };

  const handlePatternClear = () => {
    setPatternValue("");
    setFormData((prev) => ({ ...prev, unlock_pattern: "" }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      device: "",
      issue: "",
      imei: "",
      unlock_code: "",
      unlock_pattern: "",
      description: "",
      broken_parts: "",
      oxidation: false,
      screen_broken: false,
      back_broken: false,
      missing_parts: "",
    });
    setPatternValue("");
    setError(null);
    photoPreviews.forEach((p) => URL.revokeObjectURL(p));
    setPhotos([]);
    setPhotoPreviews([]);
  };

  const isMissingBoth = () => {
    const hasCode = formData.unlock_code && formData.unlock_code.trim() !== "";
    const hasPattern = formData.unlock_pattern && formData.unlock_pattern.trim() !== "";
    return !hasCode && !hasPattern;
  };

  const showSuccessMessage = (msg) => {
    const successDiv = document.createElement("div");
    successDiv.className =
      "fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce";
    successDiv.innerText = msg;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
  };

  const handleSubmitAppareil = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: clientWithUser, error: clientFetchError } = await supabase
      .from("clients")
      .select("user_id")
      .eq("id", client.id)
      .single();

    if (clientFetchError || !clientWithUser || !clientWithUser.user_id) {
      setError("Impossible de trouver l'atelier associé à ce client");
      setLoading(false);
      return;
    }

    const targetUserId = clientWithUser.user_id;

    let diagnosis = "";
    let observations = "";

    if (formData.screen_broken) diagnosis += "⚠️ Écran cassé / fissuré\n";
    if (formData.back_broken) diagnosis += "⚠️ Dos cassé\n";
    if (formData.oxidation)
      diagnosis += "⚠️ Oxydation détectée - Test impossible, pas pris en garantie\n";
    if (formData.missing_parts) diagnosis += `⚠️ Pièces manquantes : ${formData.missing_parts}\n`;
    if (formData.description) observations = formData.description;

    if (isMissingBoth()) {
      observations +=
        "\n⚠️ CODE ET SCHÉMA DÉVERROUILLAGE NON FOURNIS - Test impossible, pas pris en garantie";
    }


    try {
      const { data: newTicket, error: insertError } = await supabase
        .from("repairs")
        .insert({
          client_id: client.id,
          device: formData.device,
          issue: formData.issue,
          imei: formData.imei || "NC",
          unlock_code: formData.unlock_code || "NC",
          unlock_pattern: formData.unlock_pattern || "",
          description: observations,
          diagnosis: diagnosis,
          status: "📤 Envoyé à l'atelier",
          user_id: targetUserId,
          is_client_submitted: true,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (photos.length > 0) {
        const urls = [];
        for (const file of photos) {
          const ext = file.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
          const filePath = `repairs/${newTicket.id}/${fileName}`;
          const { error: uploadError } = await supabase.storage.from("repair-photos").upload(filePath, file);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from("repair-photos").getPublicUrl(filePath);
            urls.push(publicUrl);
          }
        }
        if (urls.length > 0) {
          await supabase.from("repairs").update({ photos: urls }).eq("id", newTicket.id);
        }
      }

      setSubmittedTickets((prev) => [...prev, { id: newTicket.id, device: formData.device }]);
      resetForm();
      showSuccessMessage(`✅ Appareil "${formData.device}" ajouté avec succès !`);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Lien invalide</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const showMissingMessage = isMissingBoth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Message de bienvenue */}
        <div className="bg-green-100 border border-green-400 rounded-xl p-4 mb-4 text-center">
          <p className="text-green-700">
            ✅ Connecté en tant que : <strong>{client?.name}</strong>
          </p>
          <p className="text-xs text-green-600 mt-1">Code client : {client?.client_code}</p>
        </div>

        {/* Liste des appareils déjà soumis */}
        {submittedTickets.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-green-700 mb-2">
              📦 Appareils déjà déclarés :
            </p>
            <div className="space-y-2">
              {submittedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between bg-white rounded-lg p-2 border border-green-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      #{ticket.id}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{ticket.device}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
            <h1 className="text-xl font-bold text-white">📱 Déclaration d'appareil</h1>
            <p className="text-orange-100 text-sm">Ajouter un nouvel appareil</p>
          </div>

          <form onSubmit={handleSubmitAppareil} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                📱 Modèle du téléphone *
              </label>
              <input
                type="text"
                name="device"
                required
                placeholder="Ex: iPhone 15 Pro, Samsung Galaxy S24..."
                value={formData.device}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                🔧 Panne / Problème *
              </label>
              <input
                type="text"
                name="issue"
                required
                placeholder="Ex: Ne charge plus, écran noir, batterie gonflée..."
                value={formData.issue}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">🔢 IMEI</label>
              <input
                type="text"
                name="imei"
                placeholder="15 chiffres (optionnel)"
                value={formData.imei}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                🔑 Code déverrouillage
              </label>
              <input
                type="text"
                name="unlock_code"
                placeholder="Code à 4 ou 6 chiffres"
                value={formData.unlock_code}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="border rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2 px-2">
                <label className="text-xs font-semibold text-gray-600">
                  🎨 Schéma déverrouillage
                </label>
                {patternValue && (
                  <span className="text-[10px] text-green-500">
                    ✓ {patternValue.split("-").length} points
                  </span>
                )}
              </div>
              <PatternLock onComplete={handlePatternComplete} onClear={handlePatternClear} />

              {showMissingMessage && (
                <p className="text-xs text-red-500 text-center mt-2 font-semibold">
                  ⚠️ CODE ET SCHÉMA DÉVERROUILLAGE NON FOURNIS - Test impossible, pas pris en
                  garantie
                </p>
              )}
            </div>

            <div className="border rounded-xl p-4 bg-gray-50">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📱 État de l'appareil
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="screen_broken"
                    checked={formData.screen_broken}
                    onChange={handleInputChange}
                    className="w-5 h-5"
                  />
                  <span>📱 Écran cassé / fissuré</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="back_broken"
                    checked={formData.back_broken}
                    onChange={handleInputChange}
                    className="w-5 h-5"
                  />
                  <span>🔧 Dos cassé</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="oxidation"
                    checked={formData.oxidation}
                    onChange={handleInputChange}
                    className="w-5 h-5"
                  />
                  <span>
                    💧 Oxydation - <span className="text-red-500">⚠️ Non pris en garantie</span>
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ⚠️ Pièces manquantes
              </label>
              <input
                type="text"
                name="missing_parts"
                placeholder="Ex: Vis, cache batterie, carte SIM..."
                value={formData.missing_parts}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                📝 Description complète
              </label>
              <textarea
                name="description"
                rows={4}
                placeholder="Décrivez précisément les problèmes constatés, l'état général..."
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                📸 Photos (optionnel)
              </label>
              <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-xl py-5 cursor-pointer transition bg-gray-50">
                <span className="text-2xl">📷</span>
                <span className="text-xs text-gray-500">Ajouter des photos de l'appareil (état, dégâts...)</span>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              </label>
              {photoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {photoPreviews.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 shrink-0">
                      <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      <button type="button" onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-700">Information importante</p>
                  <p className="text-xs text-red-600 mt-1">
                    Si les informations fournies (modèle, IMEI, état, etc.) ne correspondent pas à
                    votre appareil, nous nous réservons le droit de refuser la réparation.
                  </p>
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "➕ Ajouter cet appareil"}
            </button>

            {submittedTickets.length > 0 && (
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition"
              >
                ✅ Terminer
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
