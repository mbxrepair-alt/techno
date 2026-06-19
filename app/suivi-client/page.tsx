"use client";

import { Suspense, Fragment, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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

function getStepIndex(s: string) { return STATUS_STEPS.indexOf(s); }
const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const cleanNotes = (t?: string) => t?.replace(/\[DIAGNOSTIC VALIDÉ\]/gi, "").replace(/Risques\s*:\s*Aucun/gi, "").trim() || "";
// Les colonnes photos peuvent revenir en tableau natif OU en chaîne JSON selon le type de colonne
function toPhotoArray(v: unknown): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function SuiviClientContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") || "";
  const nameFromUrl = searchParams.get("name") || "";
  const ticketFromUrl = searchParams.get("ticket") || "";

  const [nameInput, setNameInput] = useState(nameFromUrl);
  const [codeInput, setCodeInput] = useState(codeFromUrl);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [ticketFilter, setTicketFilter] = useState("");
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [clientResponse, setClientResponse] = useState("");
  const [sending, setSending] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const runSearch = async (name: string, code: string, ticketId?: string) => {
    if (!code.trim()) { setError("Veuillez entrer votre code client."); return; }
    setLoading(true); setError(""); setClient(null); setRepairs([]); setSelectedRepair(null); setShowDetail(false); setTicketFilter("");
    try {
      const params = new URLSearchParams({ code: code.trim().toUpperCase(), name: name.trim() });
      const res = await fetch(`/api/client-tracking?${params}`);
      const json = await res.json();
      if (!res.ok || json.error) { setError("❌ Aucun client trouvé. Vérifiez votre nom et votre code."); setLoading(false); return; }
      setClient(json.client);
      const list: any[] = json.repairs || [];
      setRepairs(list);
      const direct = ticketId ? list.find((r) => String(r.id) === String(ticketId)) : null;
      if (direct) { setSelectedRepair(direct); setClientResponse(""); setShowDetail(true); setTicketFilter(String(direct.id)); }
      else if (list.length > 0) setSelectedRepair(list[0]);
    } catch { setError("❌ Erreur de chargement. Réessayez."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (codeFromUrl.trim()) runSearch(nameFromUrl, codeFromUrl, ticketFromUrl); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); runSearch(nameInput, codeInput); };
  const resetSearch = () => { setClient(null); setRepairs([]); setSelectedRepair(null); setNameInput(""); setCodeInput(""); setError(""); setShowDetail(false); setTicketFilter(""); };
  const openDetail = (r: any) => { setSelectedRepair(r); setClientResponse(""); setShowDetail(true); };

  const handleValidate = async () => {
    if (!clientResponse.trim()) { alert("Écrivez un message avant de valider."); return; }
    setSending(true);
    const { error } = await supabase.from("repairs").update({ client_response: clientResponse, client_response_type: "accepte", client_response_date: new Date().toISOString() }).eq("id", selectedRepair.id);
    if (!error) { const u = { ...selectedRepair, client_response: clientResponse, client_response_type: "accepte", client_response_date: new Date().toISOString() }; setRepairs(repairs.map(r => r.id === selectedRepair.id ? u : r)); setSelectedRepair(u); setClientResponse(""); alert("✅ Réponse envoyée !"); }
    else { alert("❌ Erreur. Réessayez."); }
    setSending(false);
  };

  const handleRefuse = async () => {
    if (!clientResponse.trim()) { alert("Écrivez un message avant de refuser."); return; }
    setSending(true);
    const hasDiag = selectedRepair.diagnostic_price > 0;
    const payload: any = { client_response: clientResponse, client_response_type: "refuse", client_response_date: new Date().toISOString(), status: "🚫 Refus client" };
    if (hasDiag) { payload.final_price = selectedRepair.diagnostic_price; payload.status = "✅ Terminé"; }
    const { error } = await supabase.from("repairs").update(payload).eq("id", selectedRepair.id);
    if (!error) { const u = { ...selectedRepair, ...payload }; setRepairs(repairs.map(r => r.id === selectedRepair.id ? u : r)); setSelectedRepair(u); setClientResponse(""); alert(hasDiag ? `Forfait diagnostic ${selectedRepair.diagnostic_price}€ facturé.` : "Refus enregistré."); }
    else { alert("❌ Erreur. Réessayez."); }
    setSending(false);
  };

  // Filtrage par numéro de ticket
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentRepairs = repairs.filter(r => new Date(r.created_at) >= sixMonthsAgo);
  const hiddenCount = repairs.length - recentRepairs.length;
  const filteredRepairs = ticketFilter.trim()
    ? recentRepairs.filter(r => String(r.id).includes(ticketFilter.replace(/^MBX-?/i, "").trim()))
    : recentRepairs;

  if (photoModal) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
        <img src={photoModal} alt="" className="max-w-full max-h-[90vh] object-contain rounded-2xl" />
        <button onClick={() => setPhotoModal(null)} className="absolute top-4 right-4 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg">✕</button>
      </div>
    );
  }

  // Détail d'un ticket
  const RepairDetail = ({ repair }: { repair: any }) => {
    const stepIdx = getStepIndex(repair.status);
    const clientPhotos = toPhotoArray(repair.photos);
    const techPhotos = toPhotoArray(repair.diagnostic_photos);
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-white font-mono">MBX-{repair.id}</h3>
            <p className="text-xs text-gray-600 mt-0.5">Déposé le {formatDate(repair.created_at)}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${STATUS_BADGE[repair.status] || "bg-gray-500/15 text-gray-400 border border-gray-500/25"}`}>{repair.status || "📥 Réceptionné"}</span>
        </div>

        {stepIdx >= 0 && (
          <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
            <div className="flex items-start">
              {STATUS_STEPS.map((step, i) => {
                const done = i < stepIdx, active = i === stepIdx;
                return (
                  <Fragment key={step}>
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 ${done ? "bg-orange-500 border-orange-500 text-white" : active ? "bg-orange-500 border-orange-500 text-white shadow-[0_0_14px_rgba(249,115,22,0.5)]" : "bg-white/3 border-white/10 text-gray-600"}`}>{done ? "✓" : i+1}</div>
                      <span className={`text-[8px] leading-tight text-center mt-1 w-10 uppercase tracking-wide ${active ? "text-orange-400 font-bold" : done ? "text-gray-500" : "text-gray-700"}`}>{step.replace(/^\S+\s/, "")}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mt-3.5 mx-0.5 rounded-full ${i < stepIdx ? "bg-orange-500" : "bg-white/8"}`} />}
                  </Fragment>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/3 border border-white/6 rounded-2xl p-3"><p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Appareil</p><p className="text-white font-semibold text-sm">{repair.device}</p></div>
          <div className="bg-white/3 border border-white/6 rounded-2xl p-3"><p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Panne</p><p className="text-white text-sm">{repair.issue}</p></div>
        </div>

        {repair.technician && <div className="bg-white/3 border border-white/6 rounded-2xl px-4 py-3 flex items-center gap-3"><span className="text-xl">👨‍🔧</span><div><p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Technicien</p><p className="text-white text-sm font-semibold">{repair.technician}</p></div></div>}

        {cleanNotes(repair.diagnostic_technicien) && <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl p-4"><p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">🔍 Diagnostic</p><p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{cleanNotes(repair.diagnostic_technicien)}</p></div>}
        {cleanNotes(repair.repair_description) && <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4"><p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">🔧 Travaux effectués</p><p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{cleanNotes(repair.repair_description)}</p></div>}
        {cleanNotes(repair.risks) && <div className="bg-orange-500/8 border border-orange-500/20 rounded-2xl p-4"><p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">⚠️ Risques</p><p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{cleanNotes(repair.risks)}</p></div>}

        {(repair.final_price > 0 || repair.estimated_price > 0) && (
          <div className="bg-white/3 border border-white/6 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">{repair.final_price > 0 ? "Prix final" : "Estimation"}</p><p className="text-white font-black text-3xl">{repair.final_price > 0 ? repair.final_price : repair.estimated_price}€</p></div>
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center text-2xl">💰</div>
          </div>
        )}

        {clientPhotos.length > 0 && (
          <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">📸 Vos photos (envoyées avant expédition)</p>
            <div className="grid grid-cols-3 gap-2">{clientPhotos.map((p: string, i: number) => <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 transition" onClick={() => setPhotoModal(p)}><img src={p} alt="" className="w-full h-full object-cover" /></div>)}</div>
          </div>
        )}

        {techPhotos.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3">🔍 Photos prises par le technicien à la réception</p>
            <div className="grid grid-cols-3 gap-2">{techPhotos.map((p: string, i: number) => <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 transition border border-amber-500/20" onClick={() => setPhotoModal(p)}><img src={p} alt="" className="w-full h-full object-cover" /></div>)}</div>
          </div>
        )}

        {(repair.status === "⏳ Attente validation client" || repair.status === "🔐 Mot de passe incorrect") && !repair.client_response && (
          <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl p-4">
            {repair.status === "⏳ Attente validation client" && techPhotos.length > 0 ? (
              <>
                <p className="text-sm font-bold text-amber-300 mb-1">⚠️ État différent constaté</p>
                <p className="text-xs text-amber-200/60 mb-4">Le technicien a constaté un état différent de vos photos à la réception. Comparez les photos ci-dessus puis validez ou contestez.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-amber-300 mb-1">{repair.status === "⏳ Attente validation client" ? "⏳ Votre accord est requis" : "🔐 Code de déverrouillage requis"}</p>
                <p className="text-xs text-amber-200/60 mb-4">{repair.status === "⏳ Attente validation client" ? "Le technicien attend votre validation." : "Le technicien a besoin de votre code."}</p>
              </>
            )}
            {repair.diagnostic_price > 0 && repair.status === "⏳ Attente validation client" && <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2 mb-4 text-xs text-red-300">⚠️ <strong>Forfait diagnostic : {repair.diagnostic_price}€</strong> — facturé si vous refusez.</div>}
            {repair.status === "🔐 Mot de passe incorrect" && <div className="mb-4 max-w-[220px] mx-auto"><PatternLock onComplete={(p) => setClientResponse(`Schéma : ${p.join("-")}`)} onClear={() => setClientResponse("")} /></div>}
            <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none focus:border-amber-500/40 resize-none mb-3" rows={3} placeholder={repair.status === "⏳ Attente validation client" ? "Votre réponse..." : "Code PIN / mot de passe"} value={clientResponse} onChange={e => setClientResponse(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={handleValidate} disabled={sending} className="flex-1 bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50">✅ {repair.status === "⏳ Attente validation client" ? "Valider" : "Envoyer"}</button>
              {repair.status === "⏳ Attente validation client" && <button onClick={handleRefuse} disabled={sending} className="flex-1 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50">❌ Refuser</button>}
            </div>
          </div>
        )}

        {repair.client_response && (
          <div className={`rounded-2xl p-4 border ${repair.client_response_type === "accepte" ? "bg-green-500/8 border-green-500/20" : "bg-red-500/8 border-red-500/20"}`}>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Votre réponse</p>
            <p className="text-gray-300 text-sm italic">"{repair.client_response}"</p>
            {repair.client_response_type === "accepte" && <p className="text-green-400 text-xs mt-2 font-semibold">✅ Accepté</p>}
            {repair.client_response_type === "refuse" && <p className="text-red-400 text-xs mt-2 font-semibold">❌ Refusé</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(249,115,22,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="fixed -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-2xl border-b border-white/6">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer shrink-0">
            <div className="relative">
              <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 opacity-75 group-hover:opacity-100 blur-md animate-spin-slow"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden">
                <img src="/logo.png" alt="MBX Logo" className="w-full h-full object-cover rounded-xl scale-105" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
              </div>
            </div>
            <div className="leading-tight">
              <span className="text-white font-black text-xl tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none block">MBX</span>
              <span className="text-orange-400 text-[9px] block mt-0.5 font-bold tracking-[0.2em] leading-tight drop-shadow-[0_0_4px_rgba(249,115,22,0.8)]">CENTRE</span>
              <span className="text-orange-400 text-[9px] block font-bold tracking-[0.2em] leading-tight drop-shadow-[0_0_4px_rgba(249,115,22,0.8)]">DE RÉPARATION</span>
            </div>
          </Link>

          {client && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-full px-3 py-1.5 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
                <span className="text-white text-xs font-bold truncate">{client.name}</span>
                <span className="text-gray-500 text-xs font-mono shrink-0 hidden sm:inline">{client.client_code}</span>
              </div>
              <button onClick={resetSearch} className="text-gray-500 hover:text-orange-400 text-xs transition px-2 py-1.5 rounded-xl hover:bg-white/5 shrink-0">← Quitter</button>
            </div>
          )}

          {client && showDetail && (
            <button onClick={() => setShowDetail(false)} className="lg:hidden text-gray-400 hover:text-white text-sm px-3 py-1.5 bg-white/5 rounded-xl transition shrink-0">← Liste</button>
          )}
        </div>
      </header>

      {/* FORMULAIRE */}
      {!client && (
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 pt-8 pb-10 relative z-10">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-3xl mb-4"><span className="text-3xl">🔍</span></div>
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
                    <input type="text" placeholder="Jean Dupont" value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-orange-500/50 focus:bg-white/8 transition text-sm" autoFocus />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Code client *</label>
                    <input type="text" required placeholder="Ex: SOP966566" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 font-mono tracking-widest text-center outline-none focus:border-orange-500/50 focus:bg-white/8 transition text-sm" />
                  </div>
                  {error && <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3"><span className="text-red-400 shrink-0">⚠️</span><p className="text-red-400 text-sm">{error}</p></div>}
                  <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-black text-sm shadow-[0_8px_32px_rgba(249,115,22,0.3)] hover:shadow-[0_8px_40px_rgba(249,115,22,0.45)] active:scale-[0.98] transition-all disabled:opacity-60 mt-1">
                    {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Recherche…</span> : "🔍 Suivre mes appareils"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RÉSULTATS */}
      {client && (
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-4 pb-10 relative z-10">
          {/* Bannière client */}
          <div className="bg-white/[0.03] border border-white/8 rounded-3xl px-5 py-4 mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-[0_0_16px_rgba(249,115,22,0.35)] shrink-0">{client.name?.charAt(0)?.toUpperCase() || "?"}</div>
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
                { label: "Total", val: recentRepairs.length, color: "text-white" },
                { label: "En cours", val: recentRepairs.filter(r => !["✅ Terminé","📦 Rendu","❌ KO","🚫 Refus client"].includes(r.status)).length, color: "text-orange-400" },
                { label: "Terminées", val: recentRepairs.filter(r => r.status === "✅ Terminé" || r.status === "📦 Rendu").length, color: "text-green-400" },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/6 rounded-2xl px-3 py-2 text-center min-w-[56px]">
                  <p className={`text-lg font-black ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Barre de recherche ticket */}
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs pointer-events-none">MBX-</span>
            <input
              ref={filterRef}
              type="text"
              inputMode="numeric"
              value={ticketFilter}
              onChange={e => setTicketFilter(e.target.value.replace(/\D/g, ""))}
              placeholder="Rechercher un ticket (ex: 192)"
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/8 rounded-2xl text-white font-mono outline-none focus:border-orange-500/40 focus:bg-white/8 transition text-sm placeholder-gray-700"
            />
            {ticketFilter && <button onClick={() => setTicketFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-sm">✕</button>}
          </div>

          {!ticketFilter.trim() ? (
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl px-5 py-8 text-center">
              <span className="text-4xl block mb-3">🔍</span>
              <p className="text-gray-500 text-sm">Entrez votre numéro de ticket pour afficher votre réparation</p>
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 text-center"><p className="text-gray-500 text-sm">Aucun ticket MBX-{ticketFilter} trouvé.</p></div>
          ) : (
            <>
              {/* MOBILE */}
              <div className="lg:hidden">
                {!showDetail ? (
                  <div className="space-y-3">
                    {filteredRepairs.map(repair => {
                      const stepIdx = getStepIndex(repair.status);
                      const needsAction = (repair.status === "⏳ Attente validation client" || repair.status === "🔐 Mot de passe incorrect") && !repair.client_response;
                      return (
                        <button key={repair.id} onClick={() => openDetail(repair)} className="w-full text-left bg-white/[0.03] border border-white/8 rounded-2xl p-4 hover:border-orange-500/30 hover:bg-orange-500/5 active:scale-[0.98] transition-all">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono font-black text-orange-400 text-sm">MBX-{repair.id}</span>
                                {needsAction && <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0" />}
                              </div>
                              <p className="text-white font-semibold text-sm truncate">{repair.device}</p>
                              <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{repair.issue}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 ${STATUS_BADGE[repair.status] || "bg-gray-500/15 text-gray-400 border border-gray-500/25"}`}>{repair.status || "📥 Réceptionné"}</span>
                          </div>
                          {stepIdx >= 0 && <div className="flex gap-1">{STATUS_STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? "bg-orange-500" : "bg-white/8"}`} />)}</div>}
                          <p className="text-[10px] text-gray-600 mt-2">Déposé le {formatDate(repair.created_at)}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : selectedRepair && (
                  <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-4"><RepairDetail repair={selectedRepair} /></div>
                )}
              </div>

              {/* DESKTOP */}
              <div className="hidden lg:grid lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 space-y-3">
                  {filteredRepairs.map(repair => {
                    const stepIdx = getStepIndex(repair.status);
                    const isActive = selectedRepair?.id === repair.id;
                    const needsAction = (repair.status === "⏳ Attente validation client" || repair.status === "🔐 Mot de passe incorrect") && !repair.client_response;
                    return (
                      <div key={repair.id} onClick={() => setSelectedRepair(repair)} className={`cursor-pointer rounded-2xl border p-4 transition-all ${isActive ? "bg-orange-500/8 border-orange-500/30" : "bg-white/[0.03] border-white/8 hover:border-white/15 hover:bg-white/5"}`}>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono font-black text-orange-400 text-sm">MBX-{repair.id}</span>
                              {needsAction && <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                            </div>
                            <p className="text-white font-semibold text-sm truncate">{repair.device}</p>
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{repair.issue}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 ${STATUS_BADGE[repair.status] || "bg-gray-500/15 text-gray-400 border border-gray-500/25"}`}>{repair.status || "📥 Réceptionné"}</span>
                        </div>
                        {stepIdx >= 0 && <div className="flex gap-1 mt-1">{STATUS_STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? "bg-orange-500" : "bg-white/8"}`} />)}</div>}
                        <p className="text-[10px] text-gray-600 mt-2">Déposé le {formatDate(repair.created_at)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="lg:col-span-3">
                  {selectedRepair ? (
                    <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-5 max-h-[80vh] overflow-y-auto"><RepairDetail repair={selectedRepair} /></div>
                  ) : (
                    <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-12 text-center h-full flex items-center justify-center"><p className="text-gray-600 text-sm">Sélectionnez une réparation</p></div>
                  )}
                </div>
              </div>

              {hiddenCount > 0 && (
                <div className="mt-4 flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-2xl px-4 py-3.5">
                  <span className="text-amber-400 text-lg shrink-0">🗂️</span>
                  <div>
                    <p className="text-amber-300 text-sm font-semibold">{hiddenCount} appareil{hiddenCount > 1 ? "s" : ""} archivé{hiddenCount > 1 ? "s" : ""}</p>
                    <p className="text-amber-200/60 text-xs mt-0.5 leading-relaxed">Les réparations de plus de 6 mois ne sont plus affichées. Contactez l'atelier pour votre historique complet.</p>
                  </div>
                </div>
              )}
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
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="w-10 h-10 border-2 border-white/10 border-t-orange-500 rounded-full animate-spin" /></div>}>
      <SuiviClientContent />
    </Suspense>
  );
}
