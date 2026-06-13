"use client";

import { Suspense, Fragment } from "react";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase"; // used only for client_response updates

const STATUS_STEPS = [
  "📥 Réceptionné",
  "🔬 Diagnostic",
  "🔧 En réparation",
  "✅ Terminé",
  "📦 Rendu",
];

const STATUS_BADGE: Record<string, string> = {
  "📥 Réceptionné":               "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  "🔬 Diagnostic":                "bg-purple-500/15 text-purple-300 border border-purple-500/30",
  "✅ Validé client":             "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  "🔧 En réparation":             "bg-orange-500/15 text-orange-300 border border-orange-500/30",
  "⏳ Attente validation client": "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  "📦 Attente pièce":             "bg-violet-500/15 text-violet-300 border border-violet-500/30",
  "✅ Terminé":                   "bg-green-500/15 text-green-300 border border-green-500/30",
  "📦 Rendu":                     "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  "❌ KO":                        "bg-red-500/15 text-red-300 border border-red-500/30",
  "🚫 Refus client":              "bg-red-500/15 text-red-300 border border-red-500/30",
  "📤 Envoyé à l'atelier":        "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
  "🔐 Mot de passe incorrect":    "bg-red-500/15 text-red-300 border border-red-500/30",
};

function getStepIndex(status: string): number {
  return STATUS_STEPS.indexOf(status);
}

function SuiviClientContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const codeFromUrl = searchParams.get("code") || "";
  const nameFromUrl = searchParams.get("name") || "";

  const [nameInput, setNameInput] = useState(nameFromUrl);
  const [codeInput, setCodeInput] = useState(codeFromUrl);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [error, setError] = useState("");
  const [clientResponse, setClientResponse] = useState("");
  const [sending, setSending] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const runSearch = async (name: string, code: string) => {
    if (!name.trim() || !code.trim()) {
      setError("Veuillez remplir les deux champs.");
      return;
    }
    setLoading(true);
    setError("");
    setClient(null);
    setRepairs([]);
    setSelectedRepair(null);

    try {
      const params = new URLSearchParams({
        code: code.trim().toUpperCase(),
        name: name.trim(),
      });
      const res = await fetch(`/api/client-tracking?${params}`);
      const json = await res.json();

      if (!res.ok || json.error) {
        if (res.status === 500) {
          setError("❌ Erreur serveur. Réessayez dans quelques instants.");
        } else {
          setError("❌ Aucun client trouvé avec ces informations. Vérifiez votre nom et votre code.");
        }
        setLoading(false);
        return;
      }

      setClient(json.client);
      const list: any[] = json.repairs || [];
      setRepairs(list);
      if (list.length > 0) setSelectedRepair(list[0]);
    } catch (err) {
      console.error(err);
      setError("❌ Erreur de chargement. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(nameInput, codeInput);
  };

  // Lien email : nom + code pré-remplis dans l'URL → chargement automatique
  useEffect(() => {
    if (nameFromUrl.trim() && codeFromUrl.trim()) {
      runSearch(nameFromUrl, codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValidate = async () => {
    if (!selectedRepair || !clientResponse.trim()) {
      alert("Veuillez écrire un message avant de valider.");
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from("repairs")
      .update({ client_response: clientResponse, client_response_type: "accepte" })
      .eq("id", selectedRepair.id);
    if (!error) {
      const updated = { ...selectedRepair, client_response: clientResponse, client_response_type: "accepte" };
      setRepairs(repairs.map((r) => (r.id === selectedRepair.id ? updated : r)));
      setSelectedRepair(updated);
      setClientResponse("");
      alert("✅ Votre réponse a été envoyée à l'atelier !");
    } else {
      alert("❌ Erreur lors de l'envoi. Réessayez.");
    }
    setSending(false);
  };

  const handleRefuse = async () => {
    if (!selectedRepair || !clientResponse.trim()) {
      alert("Veuillez écrire un message avant de refuser.");
      return;
    }
    setSending(true);

    const hasDiagnosticFee = selectedRepair.diagnostic_price > 0;
    const updatePayload: Record<string, unknown> = {
      client_response: clientResponse,
      client_response_type: "refuse",
      status: "🚫 Refus client",
    };

    if (hasDiagnosticFee) {
      // Diagnostic payant → on facture directement
      updatePayload.final_price = selectedRepair.diagnostic_price;
      updatePayload.status = "✅ Terminé";
    }

    const { error } = await supabase
      .from("repairs")
      .update(updatePayload)
      .eq("id", selectedRepair.id);

    if (!error) {
      const updated = { ...selectedRepair, ...updatePayload };
      setRepairs(repairs.map((r) => (r.id === selectedRepair.id ? updated : r)));
      setSelectedRepair(updated);
      setClientResponse("");
      if (hasDiagnosticFee) {
        alert(`Refus enregistré. Un forfait diagnostic de ${selectedRepair.diagnostic_price}€ vous sera facturé à la récupération de l'appareil.`);
      } else {
        alert("Votre refus a été enregistré. Vous pouvez venir récupérer votre appareil.");
      }
    } else {
      alert("❌ Erreur lors de l'envoi. Réessayez.");
    }
    setSending(false);
  };

  const cleanNotes = (text?: string) => {
    if (!text) return "";
    return text
      .replace(/\[DIAGNOSTIC VALIDÉ\]/gi, "")
      .replace(/Risques\s*:\s*Aucun/gi, "")
      .trim();
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const resetSearch = () => {
    setClient(null);
    setRepairs([]);
    setSelectedRepair(null);
    setNameInput("");
    setCodeInput("");
    setError("");
  };

  // Photo full-screen modal
  if (showPhotoModal && selectedPhoto) {
    return (
      <div
        className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
        onClick={() => setShowPhotoModal(false)}
      >
        <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <img
            src={selectedPhoto}
            alt="Photo"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
          />
          <button
            onClick={() => setShowPhotoModal(false)}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0f0f13]/95 backdrop-blur-xl border-b border-orange-500/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white font-black text-base">M</span>
            </div>
            <div className="text-left">
              <span className="font-black text-lg text-white tracking-tight">MBX</span>
              <span className="text-orange-500 text-xs block -mt-1 font-light">Réparations</span>
            </div>
          </button>
          <span className="text-xs text-gray-600 uppercase tracking-widest hidden sm:block">
            Suivi de réparation
          </span>
        </div>
      </header>

      {/* ── SEARCH FORM (shown when no client loaded) ── */}
      {!client ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-73px)] px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl mb-4 shadow-xl shadow-orange-500/30">
                <span className="text-3xl">🔍</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Suivi de réparation</h1>
              <p className="text-gray-500 text-sm mt-2">
                Entrez vos informations pour accéder à vos dossiers
              </p>
            </div>

            <div className="bg-[#16161d] border border-white/8 rounded-2xl p-6">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 mb-5">
                <p className="text-xs text-orange-300 leading-relaxed">
                  💡 <strong>Où trouver mon code ?</strong> Il vous a été remis lors du dépôt de
                  votre appareil ou envoyé par email/SMS.
                </p>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Nom du client
                  </label>
                  <input
                    type="text"
                    placeholder="Votre nom"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/15 transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Code client
                  </label>
                  <input
                    type="text"
                    placeholder="Votre code client"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 font-mono outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/15 transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.4)] transition-all disabled:opacity-60 mt-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Recherche en cours…
                    </span>
                  ) : (
                    "🔍 Suivre mes appareils"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* ── RESULTS ── */
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Client banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-700 rounded-2xl px-6 py-5 mb-6">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }}
            />
            <div className="relative flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-orange-200 text-xs uppercase tracking-widest mb-0.5">Client identifié</p>
                <h2 className="text-2xl font-black text-white">{client.name}</h2>
                {client.phone && client.phone !== "NC" && (
                  <p className="text-orange-200/70 text-sm mt-0.5">📞 {client.phone}</p>
                )}
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-right">
                <p className="text-orange-200 text-xs uppercase tracking-widest">Code</p>
                <p className="text-white font-mono font-bold text-lg">{client.client_code}</p>
              </div>
              <button
                onClick={resetSearch}
                className="bg-white/15 hover:bg-white/25 text-white border border-white/30 px-4 py-2 rounded-xl text-sm transition-all"
              >
                ← Nouvelle recherche
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-white">{repairs.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total</div>
            </div>
            <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-orange-400">
                {repairs.filter((r) => r.status !== "✅ Terminé" && r.status !== "📦 Rendu" && r.status !== "❌ KO" && r.status !== "🚫 Refus client").length}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">En cours</div>
            </div>
            <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-green-400">
                {repairs.filter((r) => r.status === "✅ Terminé" || r.status === "📦 Rendu").length}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Terminées</div>
            </div>
          </div>

          {repairs.length === 0 ? (
            <div className="bg-[#16161d] border border-white/5 rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-500">Aucune réparation trouvée pour ce compte.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left: repair cards list */}
              <div className="lg:col-span-2 space-y-3">
                {repairs.map((repair) => {
                  const stepIdx = getStepIndex(repair.status);
                  const isActive = selectedRepair?.id === repair.id;
                  return (
                    <div
                      key={repair.id}
                      onClick={() => setSelectedRepair(repair)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                        isActive
                          ? "bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/10"
                          : "bg-[#16161d] border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-orange-400 text-sm">
                            MBX-{repair.id}
                          </span>
                          <p className="text-white font-semibold text-sm mt-0.5 truncate">
                            {repair.device}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{repair.issue}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs whitespace-nowrap shrink-0 ${
                            STATUS_BADGE[repair.status] || "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                          }`}
                        >
                          {repair.status || "📥 Réceptionné"}
                        </span>
                      </div>

                      {/* Mini progress bar */}
                      {stepIdx >= 0 && (
                        <div className="flex gap-1 mt-1">
                          {STATUS_STEPS.map((_, i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all ${
                                i <= stepIdx ? "bg-orange-500" : "bg-white/10"
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-600 mt-2">Déposé le {formatDate(repair.created_at)}</p>
                    </div>
                  );
                })}
              </div>

              {/* Right: repair detail */}
              <div className="lg:col-span-3">
                {selectedRepair ? (
                  <div className="bg-[#16161d] border border-white/5 rounded-2xl overflow-hidden">
                    {/* Detail header */}
                    <div className="border-b border-white/5 px-6 py-5 flex flex-wrap justify-between items-center gap-3">
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-widest">Ticket</p>
                        <h3 className="text-xl font-black text-white font-mono">
                          MBX-{selectedRepair.id}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Déposé le {formatDate(selectedRepair.created_at)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-full text-sm ${
                          STATUS_BADGE[selectedRepair.status] || "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                        }`}
                      >
                        {selectedRepair.status || "📥 Réceptionné"}
                      </span>
                    </div>

                    <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
                      {/* Progress stepper */}
                      {getStepIndex(selectedRepair.status) >= 0 && (
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">Progression</p>
                          <div className="flex items-start">
                            {STATUS_STEPS.map((step, i) => {
                              const current = getStepIndex(selectedRepair.status);
                              const done = i < current;
                              const active = i === current;
                              const isLast = i === STATUS_STEPS.length - 1;
                              const stepLabel = step.replace(/^\S+\s/, "");
                              return (
                                <Fragment key={step}>
                                  <div className="flex flex-col items-center shrink-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${done ? "bg-orange-500 border-orange-500 text-white" : active ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/40" : "bg-[#0f0f13] border-white/15 text-gray-600"}`}>
                                      {done ? "✓" : i + 1}
                                    </div>
                                    <span className={`text-[9px] leading-tight text-center mt-1.5 w-12 uppercase tracking-wide ${active ? "text-orange-400 font-bold" : done ? "text-gray-400" : "text-gray-700"}`}>
                                      {stepLabel}
                                    </span>
                                  </div>
                                  {!isLast && (
                                    <div className={`flex-1 h-0.5 mt-4 mx-1 transition-all ${i < current ? "bg-orange-500" : "bg-white/10"}`} />
                                  )}
                                </Fragment>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Device + issue */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Appareil</p>
                          <p className="text-white font-semibold text-sm">{selectedRepair.device}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Panne signalée</p>
                          <p className="text-white text-sm">{selectedRepair.issue}</p>
                        </div>
                      </div>

                      {/* IMEI */}
                      {selectedRepair.imei && selectedRepair.imei !== "NC" && (
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">IMEI</p>
                          <p className="text-white font-mono text-sm">{selectedRepair.imei}</p>
                        </div>
                      )}

                      {/* Technicien */}
                      {selectedRepair.technician && (
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Technicien</p>
                          <p className="text-white text-sm">👨‍🔧 {selectedRepair.technician}</p>
                        </div>
                      )}

                      {/* 🔍 Diagnostic technicien */}
                      {cleanNotes(selectedRepair.diagnostic_technicien) && (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                          <p className="text-xs text-purple-400 uppercase tracking-wider font-bold mb-2">🔍 Diagnostic technicien</p>
                          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {cleanNotes(selectedRepair.diagnostic_technicien)}
                          </p>
                        </div>
                      )}

                      {/* 🔧 Travaux effectués */}
                      {cleanNotes(selectedRepair.repair_description) && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                          <p className="text-xs text-blue-400 uppercase tracking-wider font-bold mb-2">🔧 Travaux effectués</p>
                          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {cleanNotes(selectedRepair.repair_description)}
                          </p>
                        </div>
                      )}

                      {/* ⚠️ Risques & Préconisations */}
                      {cleanNotes(selectedRepair.risks) && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                          <p className="text-xs text-orange-400 uppercase tracking-wider font-bold mb-2">⚠️ Risques & Préconisations</p>
                          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {cleanNotes(selectedRepair.risks)}
                          </p>
                        </div>
                      )}

                      {/* Prix */}
                      {(selectedRepair.final_price > 0 || selectedRepair.estimated_price > 0) && (
                        <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                              {selectedRepair.final_price > 0 ? "Prix final" : "Estimation"}
                            </p>
                            <p className="text-white font-bold text-xl">
                              {selectedRepair.final_price > 0 ? selectedRepair.final_price : selectedRepair.estimated_price}€
                            </p>
                          </div>
                          <span className="text-3xl">💰</span>
                        </div>
                      )}

                      {/* Photos */}
                      {selectedRepair.photos?.length > 0 && (
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">📸 Photos de l&apos;appareil</p>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedRepair.photos.map((photo: string, i: number) => (
                              <div
                                key={i}
                                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition hover:scale-105 transform"
                                onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo); setShowPhotoModal(true); }}
                              >
                                <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-600 mt-2 text-center">Cliquez sur une photo pour l&apos;agrandir</p>
                        </div>
                      )}

                      {/* Bloc validation — uniquement pour les statuts qui demandent une réponse client */}
                      {(selectedRepair.status === "⏳ Attente validation client" || selectedRepair.status === "🔐 Mot de passe incorrect") &&
                        !selectedRepair.client_response && (
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                            <p className="text-sm font-semibold text-amber-300 mb-1">
                              {selectedRepair.status === "⏳ Attente validation client"
                                ? "⏳ Votre accord est requis"
                                : "🔐 Code de déverrouillage requis"}
                            </p>
                            <p className="text-xs text-amber-200/60 mb-3">
                              {selectedRepair.status === "⏳ Attente validation client"
                                ? "Le technicien attend votre validation pour poursuivre la réparation."
                                : "Le technicien a besoin de votre code pour accéder à l'appareil."}
                            </p>
                            {selectedRepair.status === "⏳ Attente validation client" && selectedRepair.diagnostic_price > 0 && (
                              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3 text-xs text-red-300">
                                ⚠️ <strong>Forfait diagnostic : {selectedRepair.diagnostic_price}€</strong> — Ce montant sera facturé si vous refusez la réparation.
                              </div>
                            )}
                            <textarea
                              className="w-full bg-[#0f0f13] border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 transition-all resize-none"
                              rows={3}
                              placeholder={
                                selectedRepair.status === "⏳ Attente validation client"
                                  ? "Écrivez votre réponse (ex: je valide le devis de 89€)"
                                  : "Entrez votre code ou schéma de déverrouillage"
                              }
                              value={clientResponse}
                              onChange={(e) => setClientResponse(e.target.value)}
                            />
                            <div className="flex gap-3 mt-3">
                              <button
                                onClick={handleValidate}
                                disabled={sending}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold shadow-[0_3px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 transition-all disabled:opacity-50"
                              >
                                ✅ {selectedRepair.status === "⏳ Attente validation client" ? "Valider" : "Envoyer le code"}
                              </button>
                              {selectedRepair.status === "⏳ Attente validation client" && (
                                <button
                                  onClick={handleRefuse}
                                  disabled={sending}
                                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold shadow-[0_3px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 transition-all disabled:opacity-50"
                                >
                                  ❌ Refuser
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-amber-400/60 mt-3 text-center">
                              Merci de nous répondre le plus rapidement possible
                            </p>
                          </div>
                        )}

                      {/* Déjà répondu */}
                      {selectedRepair.client_response && (
                        <div className={`rounded-xl p-4 border ${selectedRepair.client_response_type === "accepte" ? "bg-green-500/10 border-green-500/20" : selectedRepair.client_response_type === "refuse" ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/10"}`}>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Votre réponse</p>
                          <p className="text-gray-300 text-sm italic leading-relaxed">{selectedRepair.client_response}</p>
                          {selectedRepair.client_response_type === "accepte" && (
                            <p className="text-green-400 text-xs mt-2">✅ Vous avez accepté</p>
                          )}
                          {selectedRepair.client_response_type === "refuse" && (
                            <p className="text-red-400 text-xs mt-2">❌ Vous avez refusé</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#16161d] border border-white/5 rounded-2xl p-12 text-center">
                    <p className="text-gray-600 text-sm">Sélectionnez une réparation pour voir les détails</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/5 mt-16 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-700 text-sm">© {new Date().getFullYear()} MBX Réparations</p>
          <p className="text-gray-800 text-xs mt-1">Suivi de réparation sécurisé</p>
        </div>
      </footer>
    </div>
  );
}

export default function SuiviClientPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      }
    >
      <SuiviClientContent />
    </Suspense>
  );
}
