"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { addHistoriqueAction } from "../../lib/historique";
import { PackageCheck, Inbox } from "lucide-react";

const SUBMITTED_STATUS = "📤 Envoyé à l'atelier";

export default function ReceptionsPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("repairs")
        .select("*, clients(name, client_code, phone, email)")
        .eq("user_id", user.id)
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
              status: "🔐 Mot de passe incorrect", // gabarit générique "action requise"
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
        <p className="text-xs text-gray-500 mb-5">
          Appareils déclarés par les clients, à vérifier puis réceptionner ou refuser.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-600 py-16 bg-[#16161d] border border-white/5 rounded-2xl text-sm">
            ✅ Aucun appareil en attente de réception
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((r) => (
              <div key={r.id} className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm">{r.clients?.name || "Client"}</div>
                    <div className="text-xs text-gray-500">
                      {r.clients?.phone || ""}{r.clients?.client_code ? ` · ${r.clients.client_code}` : ""}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md shrink-0">MBX-{r.id}</span>
                </div>

                <div className="bg-black/20 rounded-xl p-3 text-sm space-y-1 mb-3">
                  <div className="text-white font-medium">📱 {r.device}</div>
                  <div className="text-gray-400 text-xs">🔧 {r.issue}</div>
                  {r.imei && r.imei !== "NC" && <div className="text-gray-500 text-xs">IMEI : {r.imei}</div>}
                  {r.unlock_code && r.unlock_code !== "NC" && <div className="text-gray-500 text-xs">🔑 Code : {r.unlock_code}</div>}
                  {r.unlock_pattern && <div className="text-gray-500 text-xs">✏️ Schéma : {r.unlock_pattern}</div>}
                  {r.description && <div className="text-gray-400 text-xs mt-1">📝 {r.description}</div>}
                </div>

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
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
