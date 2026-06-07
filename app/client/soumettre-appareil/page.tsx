"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "../../../lib/supabase";
import PatternLock from "../../../components/PatternLock";

export default function SoumettreAppareilPage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [client, setClient] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patternValue, setPatternValue] = useState("");
  const [submittedTickets, setSubmittedTickets] = useState([]);
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
    missing_parts: ""
  });

  // Fonction pour imprimer un ticket individuel
  const printTicket = (ticket) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket #${ticket.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .ticket { border: 2px solid #333; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; color: #f97316; }
          .info { margin: 10px 0; }
          .label { font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <div class="title">🔧 MBX Réparations</div>
            <div>8 Rue de l'Épée, 69003 Lyon</div>
            <div>📞 04 72 60 16 13</div>
          </div>
          <div class="info">
            <div><span class="label">Ticket n° :</span> #${ticket.id}</div>
            <div><span class="label">Client :</span> ${client?.name}</div>
            <div><span class="label">Code client :</span> ${client?.client_code}</div>
            <div><span class="label">Appareil :</span> ${ticket.device}</div>
            <div><span class="label">Date :</span> ${new Date().toLocaleDateString('fr-FR')}</div>
          </div>
          <div class="footer">
            Conservez ce ticket pour suivre votre réparation
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleIdentification = async (e) => {
    e.preventDefault();
    if (!clientCode.trim()) {
      setError("Veuillez entrer votre code client");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("client_code", clientCode.toUpperCase())
        .single();
      
      if (clientError || !clientData) {
        setError("Code client invalide. Vérifiez votre code.");
        setLoading(false);
        return;
      }
      
      if (clientName.trim() && clientData.name.toLowerCase() !== clientName.trim().toLowerCase()) {
        setError(`Le nom ne correspond pas. Le client associé à ce code est : ${clientData.name}`);
        setLoading(false);
        return;
      }
      
      setClient(clientData);
      setStep(2);
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handlePatternComplete = (pattern) => {
    const patternStr = pattern.join("-");
    setPatternValue(patternStr);
    setFormData(prev => ({ ...prev, unlock_pattern: patternStr }));
  };

  const handlePatternClear = () => {
    setPatternValue("");
    setFormData(prev => ({ ...prev, unlock_pattern: "" }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
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
      missing_parts: ""
    });
    setPatternValue("");
    setError("");
  };

  const isMissingBoth = () => {
    const hasCode = formData.unlock_code && formData.unlock_code.trim() !== "";
    const hasPattern = formData.unlock_pattern && formData.unlock_pattern.trim() !== "";
    return !hasCode && !hasPattern;
  };

  const handleSubmitAppareil = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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
    if (formData.oxidation) diagnosis += "⚠️ Oxydation détectée - Test impossible, pas pris en garantie\n";
    if (formData.missing_parts) diagnosis += `⚠️ Pièces manquantes : ${formData.missing_parts}\n`;
    if (formData.description) observations = formData.description;

    if (isMissingBoth()) {
      observations += "\n⚠️ CODE ET SCHÉMA DÉVERROUILLAGE NON FOURNIS - Test impossible, pas pris en garantie";
    }

    const technicienDiagnosis = `📋 INFORMATIONS CLIENT :
📱 Modèle: ${formData.device}
🔧 Panne déclarée: ${formData.issue}
🔢 IMEI: ${formData.imei || "NON FOURNI"}
🎨 Schéma: ${formData.unlock_pattern ? "FOURNI" : "NON FOURNI"}
🔑 Code: ${formData.unlock_code || "NON FOURNI"}

⚠️ ÉTAT CONSTATÉ PAR LE CLIENT :
${formData.screen_broken ? "- Écran cassé/fissuré\n" : ""}${formData.back_broken ? "- Dos cassé\n" : ""}${formData.oxidation ? "- Oxydation signalée\n" : ""}${formData.missing_parts ? `- Pièces manquantes: ${formData.missing_parts}\n` : ""}

📝 DESCRIPTION CLIENT :
${formData.description || "Aucune description"}

---
🔧 À vérifier par le technicien :
- [ ] Vérifier l'état réel de l'écran
- [ ] Vérifier la présence d'oxydation
- [ ] Tester la charge
- [ ] Diagnostic complet à réaliser
`;

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
          diagnostic_technicien: technicienDiagnosis,
          status: "📤 Envoyé à l'atelier",
          user_id: targetUserId,
          is_client_submitted: true,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSubmittedTickets(prev => [...prev, { id: newTicket.id, device: formData.device }]);
      resetForm();
      setError("");
      showSuccessMessage(`✅ Appareil "${formData.device}" ajouté avec succès !`);
      
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const showSuccessMessage = (msg) => {
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce';
    successDiv.innerText = msg;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
  };

  const finishAndGoHome = () => {
    router.push("/");
  };

  // ÉTAPE 1 : Identification
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
              <span className="text-3xl">🔑</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Soumettre un appareil</h1>
            <p className="text-gray-500 mb-6">Identifiez-vous avec votre code client</p>
            
            <div className="bg-orange-50 p-4 rounded-xl mb-6 border border-orange-100">
              <p className="text-sm text-orange-700">💡 Votre code client se trouve sur l'email de confirmation</p>
            </div>
            
            <form onSubmit={handleIdentification}>
              <div className="mb-4 text-left">
                <label className="block text-sm font-semibold text-gray-700 mb-2">👤 Votre nom</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              
              <div className="mb-4 text-left">
                <label className="block text-sm font-semibold text-gray-700 mb-2">🔑 Code client *</label>
                <input
                  type="text"
                  required
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                  placeholder="Ex: DOM923167"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono text-center"
                  autoFocus
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50"
              >
                {loading ? "Vérification..." : "Continuer →"}
              </button>
            </form>
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ÉTAPE 2 : Formulaire appareil
  if (step === 2) {
    const showMissingMessage = isMissingBoth();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          {/* Barre d'info client */}
          <div className="bg-white rounded-xl shadow-md p-3 mb-4 flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-500">Connecté en tant que :</span>
              <span className="font-semibold text-orange-600 ml-2">{client?.name}</span>
              <span className="text-xs text-gray-400 ml-2">({client?.client_code})</span>
            </div>
            <div className="text-sm text-gray-500">
              {submittedTickets.length > 0 && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs">
                  ✅ {submittedTickets.length} appareil(s) ajouté(s)
                </span>
              )}
            </div>
          </div>

          {/* LISTE DES APPAREILS DÉJÀ DÉCLARÉS AVEC BOUTON IMPRIMER */}
          {submittedTickets.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold text-green-700 mb-2">📦 Appareils déjà déclarés :</p>
              <div className="space-y-2">
                {submittedTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between bg-white rounded-lg p-2 border border-green-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">#{ticket.id}</span>
                      <span className="text-sm font-medium text-gray-700">{ticket.device}</span>
                    </div>
                    <button
                      onClick={() => printTicket(ticket)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition flex items-center gap-1"
                    >
                      🖨️ Imprimer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <h1 className="text-xl font-bold text-white">📱 Déclaration d'appareil</h1>
              <p className="text-orange-100 text-sm">Ajouter un nouvel appareil</p>
            </div>

            <form onSubmit={handleSubmitAppareil} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">📱 Modèle du téléphone *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">🔧 Panne / Problème *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">🔑 Code déverrouillage</label>
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
                  <label className="text-xs font-semibold text-gray-600">🎨 Schéma déverrouillage</label>
                  {patternValue && (
                    <span className="text-[10px] text-green-500">✓ {patternValue.split("-").length} points</span>
                  )}
                </div>
                <PatternLock onComplete={handlePatternComplete} onClear={handlePatternClear} />
                
                {showMissingMessage && (
                  <p className="text-xs text-red-500 text-center mt-2 font-semibold">
                    ⚠️ CODE ET SCHÉMA DÉVERROUILLAGE NON FOURNIS - Test impossible, pas pris en garantie
                  </p>
                )}
              </div>

              <div className="border rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-semibold text-gray-700 mb-3">📱 État de l'appareil</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="screen_broken" checked={formData.screen_broken} onChange={handleInputChange} className="w-5 h-5" />
                    <span>📱 Écran cassé / fissuré</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="back_broken" checked={formData.back_broken} onChange={handleInputChange} className="w-5 h-5" />
                    <span>🔧 Dos cassé</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="oxidation" checked={formData.oxidation} onChange={handleInputChange} className="w-5 h-5" />
                    <span>💧 Oxydation - <span className="text-red-500">⚠️ Non pris en garantie</span></span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">⚠️ Pièces manquantes</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">📝 Description complète</label>
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Décrivez précisément les problèmes constatés, l'état général..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                ></textarea>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-lg">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-red-700">Information importante</p>
                    <p className="text-xs text-red-600 mt-1">
                      Si les informations fournies (modèle, IMEI, état, etc.) ne correspondent pas à votre appareil, 
                      nous nous réservons le droit de refuser la réparation.
                    </p>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50"
                >
                  {loading ? "Enregistrement..." : "➕ Ajouter cet appareil"}
                </button>
                {submittedTickets.length > 0 && (
                  <button
                    type="button"
                    onClick={finishAndGoHome}
                    className="px-6 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition"
                  >
                    ✅ Terminer
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
