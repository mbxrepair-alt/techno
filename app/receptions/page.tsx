"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { addHistoriqueAction } from "../../lib/historique";
import { PackageCheck, Inbox } from "lucide-react";

const SUBMITTED_STATUS = "📤 Envoyé à l'atelier";

// Les colonnes photos peuvent revenir en tableau natif OU en chaîne JSON selon le type de colonne
function toPhotoArray(v: unknown): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

// Le champ "diagnosis" rempli par le client à la déclaration contient l'état physique
// constaté + les pièces manquantes, ligne par ligne. On les sépare pour l'affichage.
function splitClientDiagnosis(diagnosis?: string | null): { etat: string[]; pieces: string | null } {
  if (!diagnosis) return { etat: [], pieces: null };
  const lines = diagnosis.split("\n").map((l) => l.trim()).filter(Boolean);
  const etat: string[] = [];
  let pieces: string | null = null;
  for (const line of lines) {
    const m = line.match(/Pièces manquantes\s*:\s*(.+)$/i);
    if (m) pieces = m[1].trim();
    else etat.push(line.replace(/^⚠️\s*/, ""));
  }
  return { etat, pieces };
}

export default function ReceptionsPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date_asc" | "date_desc" | "client" | "ticket">("date_asc");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  // Photos prises par le TECHNICIEN à la réception (séparées des photos du client) → colonne diagnostic_photos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addTechnicianPhotos = async (r: any, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (valid.length === 0) return;
    setUploadingId(r.id);
    try {
      const urls: string[] = [];
      for (const file of valid) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
        const filePath = `repairs/${r.id}/technicien_${fileName}`;
        const { error: uploadError } = await supabase.storage.from("repair-photos").upload(filePath, file);
        if (uploadError) { console.error("upload error:", uploadError); continue; }
        const { data: { publicUrl } } = supabase.storage.from("repair-photos").getPublicUrl(filePath);
        urls.push(publicUrl);
      }
      if (urls.length === 0) { alert("Erreur lors de l'envoi des photos."); return; }
      const newPhotos = [...toPhotoArray(r.diagnostic_photos), ...urls];
      const { error } = await supabase.from("repairs").update({ diagnostic_photos: newPhotos }).eq("id", r.id);
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === r.id ? { ...it, diagnostic_photos: newPhotos } : it)));
      await addHistoriqueAction({
        repairId: r.id,
        action: "modification",
        description: `📸 ${urls.length} photo(s) technicien ajoutée(s) à la réception`,
        oldValue: null,
        newValue: null,
      });
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'envoi des photos.");
    } finally {
      setUploadingId(null);
    }
  };

  // L'état diffère des photos envoyées par le client → on bloque et on demande la validation du client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flagStateDiscrepancy = async (r: any) => {
    if (toPhotoArray(r.diagnostic_photos).length === 0) {
      alert("Ajoutez d'abord au moins une photo prise à la réception.");
      return;
    }
    if (!confirm("Signaler un état différent et bloquer la réparation en attendant la validation du client ?")) return;
    setBusyId(r.id);
    try {
      await supabase.from("repairs").update({ status: "⏳ Attente validation client" }).eq("id", r.id);
      await addHistoriqueAction({
        repairId: r.id,
        action: "changement_statut",
        description: "⚠️ État différent constaté à la réception — validation du client demandée",
        oldValue: SUBMITTED_STATUS,
        newValue: "⏳ Attente validation client",
      });
      const to = r.clients?.email;
      if (to) {
        try {
          const BASE_URL = "https://technophone.vercel.app";
          await fetch("/api/send-status-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to,
              clientName: r.clients?.name || "",
              device: r.device || "",
              status: "⏳ Attente validation client",
              reason: "etat_different",
              trackingLink: r.clients?.client_code
                ? `${BASE_URL}/suivi-client?code=${r.clients.client_code}&name=${encodeURIComponent(r.clients?.name || "")}&ticket=${r.id}`
                : "",
            }),
          });
        } catch { /* email best-effort */ }
      }
      await load();
    } catch (e) {
      console.error(e);
      alert("Erreur lors du signalement.");
    } finally {
      setBusyId(null);
    }
  };

  const displayed = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = items.filter((r) => {
      if (!term) return true;
      const name = (r.clients?.name || "").toLowerCase();
      const phone = (r.clients?.phone || "").toLowerCase();
      const code = (r.clients?.client_code || "").toLowerCase();
      return name.includes(term) || phone.includes(term) || code.includes(term) || String(r.id).includes(term) || `mbx-${r.id}`.includes(term);
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "client") return (a.clients?.name || "").localeCompare(b.clients?.name || "");
      if (sortBy === "ticket") return a.id - b.id;
      const da = new Date(a.submitted_at || a.created_at).getTime();
      const db = new Date(b.submitted_at || b.created_at).getTime();
      return sortBy === "date_asc" ? da - db : db - da;
    });
    return list;
  }, [items, search, sortBy]);

  // Regroupement par client
  const grouped = useMemo(() => {
    const map = new Map<string, { client: any; items: any[] }>();
    displayed.forEach((r) => {
      const key = String(r.client_id ?? r.clients?.name ?? r.id);
      if (!map.has(key)) map.set(key, { client: r.clients, items: [] });
      map.get(key)!.items.push(r);
    });
    return Array.from(map.values());
  }, [displayed]);

  const load = async () => {
    setLoading(true);
    try {
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("repairs")
        .select("*, clients(name, client_code, phone, email)")
        .eq("user_id", companyId)
        .eq("status", SUBMITTED_STATUS)
        .order("submitted_at", { ascending: false });
      setItems(data || []);
    } catch (e) {
      console.error("receptions load:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accept = async (r: any) => {
    setBusyId(r.id);
    try {
      await supabase.from("repairs").update({ status: "📥 Réceptionné" }).eq("id", r.id);
      await addHistoriqueAction({
        repairId: r.id,
        action: "changement_statut",
        description: "Appareil réceptionné (vérifié et accepté)",
        oldValue: SUBMITTED_STATUS,
        newValue: "📥 Réceptionné",
      });
      await load();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la réception.");
    } finally {
      setBusyId(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refuse = async (r: any) => {
    const reason = window.prompt(
      "Motif du refus (manque un accessoire, infos non conformes, etc.) :",
      ""
    );
    if (reason === null) return; // annulé
    setBusyId(r.id);
    try {
      const note = `❌ Réception refusée : ${reason || "non précisé"}`;
      await supabase
        .from("repairs")
        .update({
          status: "🚫 Refus client",
          description: r.description ? `${note}\n${r.description}` : note,
        })
        .eq("id", r.id);
      await addHistoriqueAction({
        repairId: r.id,
        action: "changement_statut",
        description: note,
        oldValue: SUBMITTED_STATUS,
        newValue: "🚫 Refus client",
      });
      // Notifier le client par email si possible
      const to = r.clients?.email;
      if (to) {
        try {
          const BASE_URL = "https://technophone.vercel.app";
          await fetch("/api/send-status-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to,
              clientName: r.clients?.name || "",
              device: r.device || "",
              status: "🚫 Refus client",
              trackingLink: r.clients?.client_code
                ? `${BASE_URL}/suivi-client?code=${r.clients.client_code}&name=${encodeURIComponent(r.clients?.name || "")}`
                : "",
            }),
          });
        } catch {
          /* email best-effort */
        }
      }
      await load();
    } catch (e) {
      console.error(e);
      alert("Erreur lors du refus.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Inbox size={20} className="text-orange-400" />
          <h1 className="text-xl font-bold text-white tracking-tight">Réceptions</h1>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Appareils déclarés par les clients, à vérifier puis réceptionner ou refuser.
        </p>

        {!loading && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Rechercher client, téléphone ou ticket (MBX-42)…"
              className="flex-1 min-w-48 bg-[#16161d] border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-orange-500/50 placeholder-gray-600"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-orange-500/50"
            >
              <option value="date_asc">Trier : Date croissante</option>
              <option value="date_desc">Trier : Date décroissante</option>
              <option value="client">Trier : Client A-Z</option>
              <option value="ticket">Trier : N° ticket</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-600 py-16 bg-[#16161d] border border-white/5 rounded-2xl text-sm">
            ✅ Aucun appareil en attente de réception
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center text-gray-600 py-16 bg-[#16161d] border border-white/5 rounded-2xl text-sm">
            Aucun résultat pour « {search} »
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((g) => (
              <div key={g.client?.client_code || g.client?.name || g.items[0].id} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="font-semibold text-white text-sm">{g.client?.name || "Client"}</div>
                  <div className="text-xs text-gray-500">
                    {g.client?.phone || ""}{g.client?.client_code ? ` · ${g.client.client_code}` : ""}
                  </div>
                  {g.items.length > 1 && (
                    <span className="text-[10px] font-semibold bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full shrink-0">
                      {g.items.length} appareils
                    </span>
                  )}
                </div>

                {g.items.map((r) => {
                  const { etat, pieces } = splitClientDiagnosis(r.diagnosis);
                  return (
                  <div key={r.id} className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                    <div className="flex items-start justify-end mb-2">
                      <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md shrink-0">MBX-{r.id}</span>
                    </div>

                    <div className="bg-black/20 rounded-xl p-3 text-sm space-y-1 mb-3">
                      <div className="text-white font-medium">📱 {r.device}</div>
                      <div className="text-gray-400 text-xs">🔧 {r.issue}</div>
                      {r.imei && r.imei !== "NC" && <div className="text-gray-500 text-xs">IMEI : {r.imei}</div>}
                      {r.unlock_code && r.unlock_code !== "NC" && <div className="text-gray-500 text-xs">🔑 Code : {r.unlock_code}</div>}
                      {r.unlock_pattern && <div className="text-gray-500 text-xs">✏️ Schéma : {r.unlock_pattern}</div>}
                    </div>

                    {etat.length > 0 && (
                      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 mb-3">
                        <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5">⚠️ État physique constaté par le client</div>
                        <ul className="text-xs text-amber-200/80 space-y-0.5">
                          {etat.map((line, i) => <li key={i}>• {line}</li>)}
                        </ul>
                      </div>
                    )}

                    {pieces && (
                      <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-3 mb-3">
                        <div className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider mb-1">🧩 Pièces manquantes</div>
                        <div className="text-xs text-orange-200/80">{pieces}</div>
                      </div>
                    )}

                    {r.description && (
                      <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-3 mb-3">
                        <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">📝 Diagnostic client</div>
                        <div className="text-xs text-blue-200/80 whitespace-pre-wrap">{r.description}</div>
                      </div>
                    )}

                    {/* Photos CLIENT (envoyées avant expédition) — lecture seule */}
                    {toPhotoArray(r.photos).length > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">👤 Photos du client (avant envoi)</div>
                        <div className="flex flex-wrap gap-2">
                          {toPhotoArray(r.photos).map((photo: string, i: number) => (
                            <img key={i} src={photo} alt="" onClick={() => setLightbox(photo)}
                              className="w-16 h-16 object-cover rounded-xl border border-white/10 cursor-pointer hover:border-blue-500/50 transition" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photos TECHNICIEN (à la réception) */}
                    <div className="mb-3">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">🔍 Photos à la réception (par vous)</div>
                      <div className="flex flex-wrap gap-2">
                        {toPhotoArray(r.diagnostic_photos).map((photo: string, i: number) => (
                          <img key={i} src={photo} alt="" onClick={() => setLightbox(photo)}
                            className="w-16 h-16 object-cover rounded-xl border border-orange-500/30 cursor-pointer hover:border-orange-500/60 transition" />
                        ))}
                        <label className="w-16 h-16 shrink-0 flex flex-col items-center justify-center gap-0.5 border-2 border-dashed border-white/10 hover:border-orange-500/40 rounded-xl cursor-pointer transition bg-white/[0.02]">
                          {uploadingId === r.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
                          ) : (
                            <>
                              <span className="text-base">📷</span>
                              <span className="text-[9px] text-gray-500">Ajouter</span>
                            </>
                          )}
                          <input type="file" accept="image/*" multiple className="hidden"
                            disabled={uploadingId === r.id}
                            onChange={(e) => { addTechnicianPhotos(r, e.target.files); e.target.value = ""; }} />
                        </label>
                      </div>
                    </div>

                    {toPhotoArray(r.diagnostic_photos).length > 0 && (
                      <button
                        onClick={() => flagStateDiscrepancy(r)}
                        disabled={busyId === r.id}
                        className="w-full mb-2 flex items-center justify-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                      >
                        ⚠️ État différent → Demander validation au client
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => accept(r)}
                        disabled={busyId === r.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                      >
                        <PackageCheck size={16} /> Réceptionner
                      </button>
                      <button
                        onClick={() => refuse(r)}
                        disabled={busyId === r.id}
                        className="flex-1 bg-red-600/90 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                      >
                        ❌ Refuser
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl hover:bg-black/70 transition">✕</button>
        </div>
      )}
    </Layout>
  );
}
