"use client";

import { Suspense, Fragment, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PatternLock from "../../components/PatternLock";

const STATUS_STEPS = ["📥 Réceptionné","🔬 Diagnostic","🔧 En réparation","✅ Terminé","📦 Rendu"];

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
const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const cleanNotes = (t?: string) => t?.replace(/\[DIAGNOSTIC VALIDÉ\]/gi, "").replace(/Risques\s*:\s*Aucun/gi, "").trim() || "";

function SuiviClientContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") || "";

  const [input, setInput] = useState("");
  const [clientCode, setClientCode] = useState(codeFromUrl);
  const [loading, setLoading] = useState(false);
  const [repair, setRepair] = useState<any>(null);
  const [error, setError] = useState("");
  const [clientResponse, setClientResponse] = useState("");
  const [sending, setSending] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async (val: string) => {
    const ticket = val.trim();
    if (!ticket) return;
    setLoading(true); setError(""); setRepair(null);
    try {
      const res = await fetch(`/api/ticket-search?ticket=${encodeURIComponent(ticket)}&code=${encodeURIComponent(clientCode.trim().toUpperCase())}`);
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error || "Ticket introuvable"); }
      else { setRepair(json.repair); }
    } catch { setError("Erreur réseau. Réessayez."); }
    finally { setLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); search(input); };

  const handleValidate = async () => {
    if (!clientResponse.trim()) { alert("Écrivez un message avant de valider."); return; }
    setSending(true);
    const { error } = await supabase.from("repairs").update({ client_response: clientResponse, client_response_type: "accepte" }).eq("id", repair.id);
    if (!error) { setRepair({ ...repair, client_response: clientResponse, client_response_type: "accepte" }); setClientResponse(""); alert("✅ Réponse envoyée !"); }
    else { alert("❌ Erreur. Réessayez."); }
    setSending(false);
  };

  const handleRefuse = async () => {
    if (!clientResponse.trim()) { alert("Écrivez un message avant de refuser."); return; }
    setSending(true);
    const hasDiagFee = repair.diagnostic_price > 0;
    const payload: any = { client_response: clientResponse, client_response_type: "refuse", status: "🚫 Refus client" };
    if (hasDiagFee) { payload.final_price = repair.diagnostic_price; payload.status = "✅ Terminé"; }
    const { error } = await supabase.from("repairs").update(payload).eq("id", repair.id);
    if (!error) { setRepair({ ...repair, ...payload }); setClientResponse(""); alert(hasDiagFee ? `Refus enregistré. Forfait diagnostic ${repair.diagnostic_price}€ facturé.` : "Refus enregistré."); }
    else { alert("❌ Erreur. Réessayez."); }
    setSending(false);
  };

  if (photoModal) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
        <img src={photoModal} alt="" className="max-w-full max-h-[90vh] object-contain rounded-2xl" />
        <button onClick={() => setPhotoModal(null)} className="absolute top-4 right-4 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg">✕</button>
      </div>
    );
  }

  const stepIdx = repair ? getStepIndex(repair.status) : -1;
  const client = repair?.clients;

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      {/* BG déco */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(249,115,22,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="fixed -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl lg:max-w-2xl mx-auto px-4 py-10 relative z-10">

        {/* LOGO */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl overflow-hidden shadow-[0_0_16px_rgba(249,115,22,0.4)]">
            <img src="/logo.png" alt="MBX" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div>
            <span className="font-black text-white text-base tracking-tight">MBX</span>
            <span className="text-orange-500 text-[9px] block -mt-0.5 font-semibold tracking-[0.15em]">RÉPARATIONS</span>
          </div>
        </div>

        {/* TITRE + BARRE DE RECHERCHE */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">Suivi de ticket</h1>
          <p className="text-gray-500 text-sm mb-6">Entrez votre numéro de ticket pour suivre votre réparation</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono font-black text-sm pointer-events-none">MBX-</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={input}
                onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
                placeholder="192"
                required
                className="w-full pl-14 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-lg tracking-widest outline-none focus:border-orange-500/50 focus:bg-white/8 transition placeholder-gray-700"
                autoFocus
              />
            </div>
            <input
              type="text"
              value={clientCode}
              onChange={(e) => setClientCode(e.target.value.toUpperCase())}
              placeholder="Code client (ex: SOP966566)"
              required
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-mono tracking-widest outline-none focus:border-orange-500/50 focus:bg-white/8 transition placeholder-gray-600 text-sm"
            />
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black rounded-2xl shadow-[0_8px_24px_rgba(249,115,22,0.3)] hover:shadow-[0_8px_32px_rgba(249,115,22,0.45)] active:scale-[0.97] transition-all disabled:opacity-60">
              {loading ? <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Recherche…</span> : "🔍 Suivre mon ticket"}
            </button>
          </form>

          {error && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3">
              <span className="text-red-400">⚠️</span>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* RÉSULTAT */}
        {repair && (
          <div className="space-y-4">
            {/* Header ticket */}
            <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  {client && <p className="text-gray-500 text-xs mb-1">👤 {client.name} · {client.client_code}</p>}
                  <h2 className="text-3xl font-black text-white font-mono">MBX-{repair.id}</h2>
                  <p className="text-gray-500 text-xs mt-1">Déposé le {formatDate(repair.created_at)}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${STATUS_BADGE[repair.status] || "bg-gray-500/15 text-gray-400 border border-gray-500/25"}`}>
                  {repair.status || "📥 Réceptionné"}
                </span>
              </div>

              {/* Stepper */}
              {stepIdx >= 0 && (
                <div className="flex items-start">
                  {STATUS_STEPS.map((step, i) => {
                    const done = i < stepIdx, active = i === stepIdx;
                    return (
                      <Fragment key={step}>
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                            done ? "bg-orange-500 border-orange-500 text-white"
                            : active ? "bg-orange-500 border-orange-500 text-white shadow-[0_0_14px_rgba(249,115,22,0.5)]"
                            : "bg-white/3 border-white/10 text-gray-600"
                          }`}>{done ? "✓" : i + 1}</div>
                          <span className={`text-[8px] leading-tight text-center mt-1 w-10 uppercase tracking-wide ${active ? "text-orange-400 font-bold" : done ? "text-gray-500" : "text-gray-700"}`}>
                            {step.replace(/^\S+\s/, "")}
                          </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mt-3.5 mx-0.5 rounded-full ${i < stepIdx ? "bg-orange-500" : "bg-white/8"}`} />}
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Appareil / Panne */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Appareil</p>
                <p className="text-white font-semibold text-sm leading-snug">{repair.device}</p>
              </div>
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Panne</p>
                <p className="text-white text-sm leading-snug">{repair.issue}</p>
              </div>
            </div>

            {/* Technicien */}
            {repair.technician && (
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">👨‍🔧</span>
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Technicien</p>
                  <p className="text-white text-sm font-semibold">{repair.technician}</p>
                </div>
              </div>
            )}

            {/* Diagnostic */}
            {cleanNotes(repair.diagnostic_technicien) && (
              <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">🔍 Diagnostic</p>
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
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">⚠️ Risques</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{cleanNotes(repair.risks)}</p>
              </div>
            )}

            {/* Prix */}
            {(repair.final_price > 0 || repair.estimated_price > 0) && (
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">{repair.final_price > 0 ? "Prix final" : "Estimation"}</p>
                  <p className="text-white font-black text-3xl">{repair.final_price > 0 ? repair.final_price : repair.estimated_price}€</p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center text-2xl">💰</div>
              </div>
            )}

            {/* Photos */}
            {repair.photos?.length > 0 && (
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">📸 Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {repair.photos.map((p: string, i: number) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 transition" onClick={() => setPhotoModal(p)}>
                      <img src={p} alt="" className="w-full h-full object-cover" />
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
                    <p className="text-xs text-amber-200/70 mb-3 text-center">Dessinez votre schéma ou tapez votre code ci-dessous</p>
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
                    className="flex-1 bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50">
                    ✅ {repair.status === "⏳ Attente validation client" ? "Valider" : "Envoyer"}
                  </button>
                  {repair.status === "⏳ Attente validation client" && (
                    <button onClick={handleRefuse} disabled={sending}
                      className="flex-1 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50">
                      ❌ Refuser
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Réponse déjà envoyée */}
            {repair.client_response && (
              <div className={`rounded-2xl p-4 border ${repair.client_response_type === "accepte" ? "bg-green-500/8 border-green-500/20" : "bg-red-500/8 border-red-500/20"}`}>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Votre réponse</p>
                <p className="text-gray-300 text-sm italic leading-relaxed">"{repair.client_response}"</p>
                {repair.client_response_type === "accepte" && <p className="text-green-400 text-xs mt-2 font-semibold">✅ Accepté</p>}
                {repair.client_response_type === "refuse" && <p className="text-red-400 text-xs mt-2 font-semibold">❌ Refusé</p>}
              </div>
            )}

            {/* Nouvelle recherche */}
            <button onClick={() => { setRepair(null); setInput(""); setError(""); setTimeout(() => inputRef.current?.focus(), 100); }}
              className="w-full py-3 border border-white/8 rounded-2xl text-gray-500 text-sm hover:border-white/15 hover:text-gray-300 transition">
              🔍 Rechercher un autre ticket
            </button>
          </div>
        )}

        <p className="text-gray-800 text-xs text-center mt-10">© {new Date().getFullYear()} MBX Réparations</p>
      </div>
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
