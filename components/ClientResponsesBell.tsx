"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function ClientResponsesBell({ userId }: { userId: string }) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [seenResponses, setSeenResponses] = useState<Set<string>>(new Set());
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("seen_client_responses");
      if (saved) setSeenResponses(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("repairs")
      .select("id,device,client_response,clients(name)")
      .eq("user_id", userId)
      .not("client_response", "is", null)
      .neq("client_response", "")
      .then(({ data }) => setRepairs(data || []));
  }, [userId]);

  const respSig = (r: any) => `${r.id}:${r.client_response}`;
  const responseRepairs = repairs.filter((r) => r.client_response && String(r.client_response).trim());
  const unseenResponses = responseRepairs.filter((r) => !seenResponses.has(respSig(r)));

  const markResponsesSeen = () => {
    const next = new Set(seenResponses);
    responseRepairs.forEach((r) => next.add(respSig(r)));
    setSeenResponses(next);
    try { localStorage.setItem("seen_client_responses", JSON.stringify([...next])); } catch { /* ignore */ }
  };

  const openNotifs = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setShowNotifs((o) => !o);
    markResponsesSeen();
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={openNotifs}
        className="relative w-10 h-10 flex items-center justify-center bg-[#16161d] border border-white/8 rounded-xl text-gray-300 hover:text-white hover:border-white/20 transition-all"
        title="Réponses clients"
      >
        <Bell size={18} />
        {unseenResponses.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0f0f13]">
            {unseenResponses.length}
          </span>
        )}
      </button>

      {showNotifs && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowNotifs(false)} />
          <div
            className="fixed w-80 max-h-96 overflow-y-auto bg-[#16161d] border border-white/10 rounded-2xl shadow-2xl z-[9999]"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
          >
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-bold text-white">🔔 Réponses clients</span>
              <span className="text-xs text-gray-500">{responseRepairs.length}</span>
            </div>
            {responseRepairs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-600">Aucune réponse client</div>
            ) : (
              <div className="divide-y divide-white/5">
                {responseRepairs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setShowNotifs(false); router.push(`/repairs/${r.id}`); }}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white truncate">{r.clients?.name || "Client"}</span>
                      <span className="font-mono text-[10px] text-indigo-400 shrink-0">MBX-{r.id}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{r.device}</div>
                    <div className="text-xs text-amber-300 mt-1 line-clamp-2">💬 {r.client_response}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
