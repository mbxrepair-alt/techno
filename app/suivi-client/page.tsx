"use client";

import { Suspense, Fragment } from "react";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PatternLock from "../../components/PatternLock";

const STATUS_STEPS = [
  "📥 Réceptionné",
  "🔬 Diagnostic",
  "🔧 En réparation",
  "✅ Terminé",
  "📦 Rendu",
];

const STATUS_BADGE: Record<string, string> = {
  "📥 Réceptionné":               "bg-blue-500/15 text-blue-300 border border-blue-500/25",
  "🔬 Diagnostic":                "bg-purple-500/15 text-purple-300 border border-purple-500/25",
  "✅ Validé client":             "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  "🔧 En réparation":             "bg-orange-500/15 text-orange-300 border border-orange-500/25",
  "⏳ Attente validation client": "bg-amber-500/15 text-amber-300 border border-amber-500/25",
  "📦 Attente pièce":             "bg-violet-500/15 text-violet-300 border border-violet-500/25",
  "✅ Terminé":                   "bg-green-500/15 text-green-300 border border-green-500/25",
  "📦 Rendu":                     "bg-gray-500/15 text-gray-400 border border-gray-500/25",
  "❌ KO":                        "bg-red-500/15 text-red-300 border border-red-500/25",
  "🚫 Refus client":              "bg-red-500/15 text-red-300 border border-red-500/25",
  "📤 Envoyé à l'atelier":        "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25",
  "🔐 Mot de passe incorrect":    "bg-red-500/15 text-red-300 border border-red-500/25",
};

function getStepIndex(status: string) { return STATUS_STEPS.indexOf(status); }

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
  // Mobile: show detail panel
  const [showDetail, setShowDetail] = useState(false);

  const runSearch = async (name: string, code: string) => {
    if (!code.trim()) { setError("Veuillez entrer votre code client."); return; }
    setLoading(true); setError(""); setClient(null); setRepairs([]); setSelectedRepair(null); setShowDetail(false);
    try {
      const params = new URLSearchParams({ code: code.trim().toUpperCase(), name: name.trim() });
      const res = await fetch(`/api/client-tracking?${params}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(res.status === 500
          ? "❌ Erreur serveur. Réessayez dans quelques instants."
          : "❌ Aucun client trouvé. Vérifiez votre nom et votre code.");
        setLoading(false); return;
      }
      setClient(json.client);
      const list: any[] = json.repairs || [];
      setRepairs(list);
      if (list.length > 0) setSelectedRepair(list[0]);
    } catch { setError("❌ Erreur de chargement. Réessayez."); }
    finally { setLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); runSearch(nameInput, codeInput); };

  useEffect(() => {
    if (codeFromUrl.trim()) runSearch(nameFromUrl, codeFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValidate = async () => {
    if (!selectedRepair || !clientResponse.trim()) { alert("Veuillez écrire un message avant de valider."); return; }
    setSending(true);
    const { error } = await supabase.from("repairs").update({ client_response: clientResponse, client_response_type: "accepte" }).eq("id", selectedRepair.id);
    if (!error) {
      const updated = { ...selectedRepair, client_response: clientResponse, client_response_type: "accepte" };
      setRepairs(repairs.map((r) => (r.id === selectedRepair.id ? updated : r)));
      setSelectedRepair(updated); setClientResponse("");
      alert("✅ Votre réponse a été envoyée à l'atelier !");
    } else { alert("❌ Erreur lors de l'envoi. Réessayez."); }
    setSending(false);
  };

  const handleRefuse = async () => {
    if (!selectedRepair || !clientResponse.trim()) { alert("Veuillez écrire un message avant de refuser."); return; }
    setSending(true);
    const hasDiagnosticFee = selectedRepair.diagnostic_price > 0;
    const updatePayload: Record<string, unknown> = { client_response: clientResponse, client_response_type: "refuse", status: "🚫 Refus client" };
    if (hasDiagnosticFee) { updatePayload.final_price = selectedRepair.diagnostic_price; updatePayload.status = "✅ Terminé"; }
    const { error } = await supabase.from("repairs").update(updatePayload).eq("id", selectedRepair.id);
    if (!error) {
      const updated = { ...selectedRepair, ...updatePayload };
      setRepairs(repairs.map((r) => (r.id === selectedRepair.id ? updated : r)));
      setSelectedRepair(updated); setClientResponse("");
      alert(hasDiagnosticFee ? `Refus enregistré. Forfait diagnostic de ${selectedRepair.diagnostic_price}€ facturé à la récupération.` : "Refus enregistré. Vous pouvez venir récupérer votre appareil.");
    } else { alert("❌ Erreur lors de l'envoi. Réessayez."); }
    setSending(false);
  };

  const cleanNotes = (text?: string) => text?.replace(/\[DIAGNOSTIC VALIDÉ\]/gi, "").replace(/Risques\s*:\s*Aucun/gi, "").trim() || "";
  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const resetSearch = () => { setClient(null); setRepairs([]); setSelectedRepair(null); setNameInput(""); setCodeInput(""); setError(""); setShowDetail(false); };

  const openDetail = (repair: any) => { setSelectedRepair(repair); setClientResponse(""); setShowDetail(true); };

  // Photo modal
  if (showPhotoModal && selectedPhoto) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
        <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <img src={selectedPhoto} alt="Photo" className="max-w-full max-h-[90vh] object-contain rounded-2xl" />
          <button onClick={() => setShowPhotoModal(false)} className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg transition">✕</button>
        </div>
      </div>
    );
  }

  // ── REPAIR DETAIL PANEL (content, reused on mobile + desktop) ──
  const RepairDetail = ({ repair }: { repair: any }) => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Ticket</p>
          <h3 className="text-2xl font-black text-white font-mono">MBX-{repair.id}</h3>
          <p className="text-xs text-gray-600 mt-0.5">Déposé le {formatDate(repair.created_at)}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_BADGE[repair.status] || "bg-gray-500/15 text-gray-400 border border-gray-500/25"}`}>
          {repair.status || "📥 Réceptionné"}
        </span>
      </div>

      {/* Stepper */}
      {getStepIndex(repair.status) >= 0 && (
        <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">Progression</p>
          <div className="flex items-start">
            {STATUS_STEPS.map((step, i) => {
              const current = getStepIndex(repair.status);
              const done = i < current, active = i === current;
              const label = step.replace(/^\S+\s/, "");
              return (
                <Fragment key={step}>
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                      done ? "bg-orange-500 border-orange-500 text-white"
                      : active ? "bg-orange-500 border-orange-500 text-white shadow-[0_0_16px_rgba(249,115,22,0.5)]"
                      : "bg-white/3 border-white/10 text-gray-600"
                    }`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`text-[9px] leading-tight text-center mt-1.5 w-12 uppercase tracking-wide ${active ? "text-orange-400 font-bold" : done ? "text-gray-500" : "text-gray-700"}`}>{label}</span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mt-4 mx-1 transition-all rounded-full ${i < current ? "bg-orange-500" : "bg-white/8"}`} />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Appareil + panne */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/3 border border-white/6 rounded-2xl p-3">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Appareil</p>
          <p className="text-white font-semibold text-sm leading-snug">{repair.device}</p>
        </div>
        <div className="bg-white/3 border border-white/6 rounded-2xl p-3">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Panne</p>
          <p className="text-white text-sm leading-snug">{repair.issue}</p>
        </div>
      </div>

      {/* IMEI */}
      {repair.imei && repair.imei !== "NC" && (
        <div className="bg-white/3 border border-white/6 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-widest shrink-0">IMEI</span>
          <span className="text-white font-mono text-sm">{repair.imei}</span>
        </div>
      )}

      {/* Technicien */}
      {repair.technician && (
        <div className="bg-white/3 border border-white/6 rounded-2xl px-4 py-3 flex items-center gap-2">
          <span className="text-base">👨‍🔧</span>
          <div>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Technicien</p>
            <p className="text-white text-sm font-semibold">{repair.technician}</p>
          </div>
        </div>
      )}

      {/* Diagnostic */}
      {cleanNotes(repair.diagnostic_technicien) && (
        <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">🔍 Diagnostic technicien</p>
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{cleanNotes(repair.diagnostic_technicien)}</p>
        </div>
      )}

      {/* Travaux */}
      {cleanNotes(repair.repair_description) && (
        <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">🔧 Travaux effectués</p>
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{cleanNotes(repair.repair_description)}</p>
        </div>
      )}

      {/* Risques */}
      {cleanNotes(repair.risks) && (
        <div className="bg-orange-500/8 border border-orange-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">⚠️ Risques & Préconisations</p>
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{cleanNotes(repair.risks)}</p>
        </div>
      )}

      {/* Prix */}
      {(repair.final_price > 0 || repair.estimated_price > 0) && (
        <div className="bg-white/3 border border-white/6 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">{repair.final_price > 0 ? "Prix final" : "Estimation"}</p>
            <p className="text-white font-black text-2xl">{repair.final_price > 0 ? repair.final_price : repair.estimated_price}€</p>
          </div>
          <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center text-xl">💰</div>
        </div>
      )}

      {/* Photos */}
      {repair.photos?.length > 0 && (
        <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">📸 Photos</p>
          <div className="grid grid-cols-3 gap-2">
            {repair.photos.map((photo: string, i: number) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 transition"
                onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo); setShowPhotoModal(true); }}>
                <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloc validation */}
      {(repair.status === "⏳ Attente validation client" || repair.status === "🔐 Mot de passe incorrect") && !repair.client_response && (
        <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-300 mb-1">
            {repair.status === "⏳ Attente validation client" ? "⏳ Votre accord est requis" : "🔐 Code de déverrouillage requis"}
          </p>
          <p className="text-xs text-amber-200/60 mb-4 leading-relaxed">
            {repair.status === "⏳ Attente validation client"
              ? "Le technicien attend votre validation pour poursuivre la réparation."
              : "Le technicien a besoin de votre code pour accéder à l'appareil."}
          </p>
          {repair.diagnostic_price > 0 && repair.status === "⏳ Attente validation client" && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2 mb-4 text-xs text-red-300">
              ⚠️ <strong>Forfait diagnostic : {repair.diagnostic_price}€</strong> — Ce montant sera facturé si vous refusez.
            </div>
          )}
          {repair.status === "🔐 Mot de passe incorrect" && (
            <div className="mb-4">
              <p className="text-xs text-amber-200/70 mb-3 text-center">Dessinez votre schéma ci-dessous <span className="text-amber-400">ou</span> tapez votre code plus bas</p>
              <div className="max-w-[220px] mx-auto">
                <PatternLock onComplete={(p) => setClientResponse(`Schéma : ${p.join("-")}`)} onClear={() => setClientResponse("")} />
              </div>
            </div>
          )}
          <textarea
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none focus:border-amber-500/40 transition-all resize-none mb-3"
            rows={3}
            placeholder={repair.status === "⏳ Attente validation client" ? "Votre réponse (ex: je valide le devis de 89€)" : "Code PIN / mot de passe"}
            value={clientResponse}
            onChange={(e) => setClientResponse(e.target.value)}
          />
          <div className="flex gap-3">
            <button onClick={handleValidate} disabled={sending}
              className="flex-1 bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50">
              ✅ {repair.status === "⏳ Attente validation client" ? "Valider" : "Envoyer le code"}
            </button>
            {repair.status === "⏳ Attente validation client" && (
              <button onClick={handleRefuse} disabled={sending}
                className="flex-1 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50">
                ❌ Refuser
              </button>
            )}
          </div>
        </div>
      )}

      {/* Réponse déjà envoyée */}
      {repair.client_response && (
        <div className={`rounded-2xl p-4 border ${repair.client_response_type === "accepte" ? "bg-green-500/8 border-green-500/20" : repair.client_response_type === "refuse" ? "bg-red-500/8 border-red-500/20" : "bg-white/3 border-white/8"}`}>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Votre réponse</p>
          <p className="text-gray-300 text-sm italic leading-relaxed">"{repair.client_response}"</p>
          {repair.client_response_type === "accepte" && <p className="text-green-400 text-xs mt-2 font-semibold">✅ Accepté</p>}
          {repair.client_response_type === "refuse" && <p className="text-red-400 text-xs mt-2 font-semibold">❌ Refusé</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      {/* BG */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(249,115,22,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.025)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="fixed -top-40 -left-40 w-80 h-80 bg-orange-500/6 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-80 h-80 bg-orange-600/6 rounded-full blur-[100px] pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-2xl border-b border-white/6">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={() => router.push("/")} className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl overflow-hidden shadow-[0_0_12px_rgba(249,115,22,0.35)]">
              <img src="/logo.png" alt="MBX" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="leading-tight">
              <span className="font-black text-base text-white tracking-tight">MBX</span>
              <span className="text-orange-500 text-[9px] block -mt-0.5 font-semibold tracking-[0.15em]">RÉPARATIONS</span>
            </div>
          </button>

          {client && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-full px-3 py-1.5 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-white text-xs font-bold truncate">{client.name}</span>
                <span className="text-gray-500 text-xs font-mono shrink-0 hidden sm:inline">{client.client_code}</span>
              </div>
              <button onClick={resetSearch} className="text-gray-500 hover:text-orange-400 text-xs transition px-2 py-1.5 rounded-xl hover:bg-white/5 shrink-0">
                ← Quitter
              </button>
            </div>
          )}

          {/* Mobile: back from detail */}
          {client && showDetail && (
            <button onClick={() => setShowDetail(false)} className="lg:hidden text-gray-400 hover:text-white text-sm px-3 py-1.5 bg-white/5 rounded-xl transition shrink-0">
              ← Liste
            </button>
          )}
        </div>
      </header>

      {/* ── SEARCH FORM ── */}
      {!client && (
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 pt-8 pb-10 relative z-10">
          <div className="w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-3xl mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Suivi de réparation</h1>
              <p className="text-gray-500 text-sm mt-1.5">Accédez à vos dossiers en toute sécurité</p>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/8 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0" />
              <div className="p-6">
                <div className="flex items-start gap-2 bg-orange-500/8 border border-orange-500/15 rounded-2xl px-4 py-3 mb-5">
                  <span className="text-orange-400 shrink-0 mt-0.5">💡</span>
                  <p className="text-xs text-orange-300/90 leading-relaxed">Votre code client vous a été remis lors du dépôt ou envoyé par email/SMS</p>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Votre nom</label>
                    <input type="text" placeholder="Jean Dupont" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-orange-500/50 focus:bg-white/8 transition text-sm" autoFocus />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Code client *</label>
                    <input type="text" required placeholder="Ex: SOP966566" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 font-mono tracking-widest text-center outline-none focus:border-orange-500/50 focus:bg-white/8 transition text-sm" />
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3">
                      <span className="text-red-400 shrink-0">⚠️</span>
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-black text-sm shadow-[0_8px_32px_rgba(249,115,22,0.3)] hover:shadow-[0_8px_40px_rgba(249,115,22,0.45)] active:scale-[0.98] transition-all disabled:opacity-60 mt-1">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Recherche…
                      </span>
                    ) : "🔍 Suivre mes appareils"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {client && (
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-4 pb-10 relative z-10">

          {/* Client banner */}
          <div className="bg-white/[0.03] border border-white/8 rounded-3xl px-5 py-4 mb-5 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-[0_0_16px_rgba(249,115,22,0.35)] shrink-0">
                {client.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-lg leading-tight truncate">{client.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-gray-500 text-xs font-mono">{client.client_code}</span>
                  {client.phone && client.phone !== "NC" && <span className="text-gray-600 text-xs">· 📞 {client.phone}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: "Total", val: repairs.length, color: "text-white" },
                { label: "En cours", val: repairs.filter((r) => !["✅ Terminé","📦 Rendu","❌ KO","🚫 Refus client"].includes(r.status)).length, color: "text-orange-400" },
                { label: "Terminées", val: repairs.filter((r) => r.status === "✅ Terminé" || r.status === "📦 Rendu").length, color: "text-green-400" },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 border border-white/6 rounded-2xl px-3 py-2 text-center min-w-[56px]">
                  <p className={`text-lg font-black ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {repairs.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-12 text-center">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-500">Aucune réparation trouvée pour ce compte.</p>
            </div>
          ) : (
            <>
              {/* MOBILE: liste ou détail */}
              <div className="lg:hidden">
                {!showDetail ? (
                  <div className="space-y-3">
                    {repairs.map((repair) => {
                      const stepIdx = getStepIndex(repair.status);
                      const needsAction = (repair.status === "⏳ Attente validation client" || repair.status === "🔐 Mot de passe incorrect") && !repair.client_response;
                      return (
                        <button key={repair.id} onClick={() => openDetail(repair)}
                          className="w-full text-left bg-white/[0.03] border border-white/8 rounded-2xl p-4 hover:border-orange-500/30 hover:bg-orange-500/5 active:scale-[0.98] transition-all">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono font-black text-orange-400 text-sm">MBX-{repair.id}</span>
                                {needsAction && <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0" />}
                              </div>
                              <p className="text-white font-semibold text-sm truncate">{repair.device}</p>
                              <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{repair.issue}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap ${STATUS_BADGE[repair.status] || "bg-gray-500/15 text-gray-400 border border-gray-500/25"}`}>
                                {repair.status || "📥 Réceptionné"}
                              </span>
                              <span className="text-gray-600 text-[10px]">→ Voir</span>
                            </div>
                          </div>
                          {stepIdx >= 0 && (
                            <div className="flex gap-1">
                              {STATUS_STEPS.map((_, i) => (
                                <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? "bg-orange-500" : "bg-white/8"}`} />
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-gray-600 mt-2">Déposé le {formatDate(repair.created_at)}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : selectedRepair && (
                  <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-4">
                    <RepairDetail repair={selectedRepair} />
                  </div>
                )}
              </div>

              {/* DESKTOP: 2 colonnes */}
              <div className="hidden lg:grid lg:grid-cols-5 gap-4">
                {/* Liste */}
                <div className="lg:col-span-2 space-y-3">
                  {repairs.map((repair) => {
                    const stepIdx = getStepIndex(repair.status);
                    const isActive = selectedRepair?.id === repair.id;
                    const needsAction = (repair.status === "⏳ Attente validation client" || repair.status === "🔐 Mot de passe incorrect") && !repair.client_response;
                    return (
                      <div key={repair.id} onClick={() => setSelectedRepair(repair)}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                          isActive ? "bg-orange-500/8 border-orange-500/30" : "bg-white/[0.03] border-white/8 hover:border-white/15 hover:bg-white/5"
                        }`}>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono font-black text-orange-400 text-sm">MBX-{repair.id}</span>
                              {needsAction && <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                            </div>
                            <p className="text-white font-semibold text-sm truncate">{repair.device}</p>
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{repair.issue}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 ${STATUS_BADGE[repair.status] || "bg-gray-500/15 text-gray-400 border border-gray-500/25"}`}>
                            {repair.status || "📥 Réceptionné"}
                          </span>
                        </div>
                        {stepIdx >= 0 && (
                          <div className="flex gap-1 mt-1">
                            {STATUS_STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? "bg-orange-500" : "bg-white/8"}`} />)}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-600 mt-2">Déposé le {formatDate(repair.created_at)}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Détail */}
                <div className="lg:col-span-3">
                  {selectedRepair ? (
                    <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-5 max-h-[80vh] overflow-y-auto">
                      <RepairDetail repair={selectedRepair} />
                    </div>
                  ) : (
                    <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-12 text-center h-full flex items-center justify-center">
                      <p className="text-gray-600 text-sm">Sélectionnez une réparation pour voir les détails</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <footer className="border-t border-white/5 mt-8 py-5 relative z-10">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 text-center">
          <p className="text-gray-700 text-xs">© {new Date().getFullYear()} MBX Réparations — Suivi sécurisé</p>
        </div>
      </footer>
    </div>
  );
}

export default function SuiviClientPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-orange-500 rounded-full animate-spin" />
      </div>
    }>
      <SuiviClientContent />
    </Suspense>
  );
}
