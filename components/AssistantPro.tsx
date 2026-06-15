"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

interface Client {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  client_code: string | null;
}

export default function AssistantPro() {
  const [isOpen, setIsOpen] = useState(false);

  // Client search
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [clientHighlight, setClientHighlight] = useState(-1);
  const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpeechRef = useRef<number>(0);

  // Panel drag
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [panelReady, setPanelReady] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);

  // Tab drag
  const [tabY, setTabY] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const s = localStorage.getItem("mbx_tab_y");
    return s !== null ? Number(s) : null;
  });
  const tabDragging = useRef(false);
  const tabMoved = useRef(false);
  const tabStartY = useRef(0);
  const tabStartTabY = useRef(0);
  const tabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && !panelReady) {
      setPos({ x: window.innerWidth - 410, y: Math.max(16, window.innerHeight - 500) });
      setPanelReady(true);
      setTimeout(() => clientInputRef.current?.focus(), 50);
    }
    if (!isOpen) { stopRecording(); setPanelReady(false); }
  }, [isOpen]);

  // Clic extérieur → fermer le panneau
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!isOpen) return;
      if (!panelRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isOpen]);

  // Panel drag
  const onPanelMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const w = panelRef.current?.offsetWidth ?? 390;
      const h = panelRef.current?.offsetHeight ?? 460;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - w, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - h, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // Tab drag
  const onTabMouseDown = (e: React.MouseEvent) => {
    tabDragging.current = true;
    tabMoved.current = false;
    tabStartY.current = e.clientY;
    tabStartTabY.current = tabY ?? (window.innerHeight / 2 - 60);
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!tabDragging.current) return;
      const dy = e.clientY - tabStartY.current;
      if (Math.abs(dy) > 3) tabMoved.current = true;
      const h = tabRef.current?.offsetHeight ?? 110;
      const y = Math.max(0, Math.min(window.innerHeight - h, tabStartTabY.current + dy));
      setTabY(y);
      localStorage.setItem("mbx_tab_y", String(y));
    };
    const onUp = () => {
      if (tabDragging.current && !tabMoved.current) setIsOpen(true);
      tabDragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [tabY]);

  // Client search
  const searchClients = (q: string) => {
    setClientSearch(q);
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
    if (!q.trim()) { setClientResults([]); return; }
    clientSearchTimer.current = setTimeout(async () => {
      setClientSearching(true);
      const companyId = localStorage.getItem("company_id");
      const { data } = await supabase
        .from("clients")
        .select("id, name, phone, email, client_code")
        .eq("user_id", companyId)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(6);
      setClientResults((data as Client[]) ?? []);
      setClientSearching(false);
    }, 250);
  };

  const selectClient = (c: Client) => {
    window.dispatchEvent(new CustomEvent("assistant:fillForm", {
      detail: { clientName: c.name, clientPhone: c.phone ?? null, clientEmail: c.email ?? null, clientType: "particulier", repairs: [] },
    }));
    setClientSearch("");
    setClientResults([]);
    setClientHighlight(-1);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const onClientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!clientResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setClientHighlight((h) => Math.min(h + 1, clientResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setClientHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = clientHighlight >= 0 ? clientHighlight : 0;
      if (clientResults[idx]) selectClient(clientResults[idx]);
    } else if (e.key === "Escape") {
      setClientResults([]);
      setClientHighlight(-1);
    }
  };

  // Voice
  const stopRecording = (reason: "manual" | "timeout" | "silence" = "manual") => {
    recognitionRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (silenceRef.current) { clearInterval(silenceRef.current); silenceRef.current = null; }
    setIsListening(false);
    setInterimText("");
    setCountdown(60);
    if (reason === "timeout") setAiText((p) => p.trimEnd() + " ✅");
  };

  const toggleListening = () => {
    if (isListening) { stopRecording(); return; }
    const SR = typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "fr-FR"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e: any) => {
      lastSpeechRef.current = Date.now();
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript as string;
        if (e.results[i].isFinal) setAiText((p) => p ? p + " " + t : t);
        else interim += t;
      }
      setInterimText(interim);
    };
    rec.onerror = (e: any) => { if (e.error !== "aborted") stopRecording(); };
    rec.onend = () => { setIsListening(false); setInterimText(""); };
    recognitionRef.current = rec;
    rec.start(); setIsListening(true); setCountdown(60); lastSpeechRef.current = Date.now();
    let r = 60;
    timerRef.current = setInterval(() => { r--; setCountdown(r); if (r <= 0) stopRecording("timeout"); }, 1000);
    silenceRef.current = setInterval(() => { if (Date.now() - lastSpeechRef.current > 5000) stopRecording("silence"); }, 500);
  };

  const handleExtract = async () => {
    if (!aiText.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const { extractFormDataFromText } = await import("../lib/ai");
      const result = await extractFormDataFromText(aiText.trim());
      window.dispatchEvent(new CustomEvent("assistant:fillForm", { detail: result }));
      setAiText("");
      setIsOpen(false);
    } finally { setAiLoading(false); }
  };

  const tabStyle = tabY !== null
    ? { top: tabY, right: 0, position: "fixed" as const }
    : { top: "50%", right: 0, transform: "translateY(-50%)", position: "fixed" as const };

  return (
    <>
      {/* ── Onglet latéral ── */}
      {!isOpen && (
        <button
          ref={tabRef}
          onMouseDown={onTabMouseDown}
          style={tabStyle}
          className="z-50 flex flex-col items-center justify-center gap-2 w-8 py-6 rounded-l-2xl bg-[#18181f] border border-white/10 border-r-0 text-gray-400 hover:text-white hover:bg-[#1f1f2e] cursor-grab active:cursor-grabbing transition-all duration-200 select-none shadow-[-4px_4px_24px_rgba(0,0,0,0.5)]"
        >
          <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
          <span
            className="text-[9px] font-bold tracking-[0.15em] uppercase"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            IA
          </span>
        </button>
      )}

      {/* ── Panneau flottant ── */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{ left: pos.x, top: pos.y, width: 390, position: "fixed", zIndex: 9999 }}
          className="bg-[#111118] border border-white/[0.08] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Header */}
          <div
            onMouseDown={onPanelMouseDown}
            className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-white/90 font-semibold text-sm tracking-tight">✨ IA (texte / voix)</span>
            </div>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/[0.06] transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="p-4 flex flex-col gap-3">

            {/* Client search */}
            <div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <input
                  type="text"
                  ref={clientInputRef}
                  placeholder="Client existant…"
                  value={clientSearch}
                  onChange={(e) => { searchClients(e.target.value); setClientHighlight(-1); }}
                  onKeyDown={onClientKeyDown}
                  className="w-full bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] focus:border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none transition-all"
                />
                {clientSearching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">…</span>}
              </div>
              {clientResults.length > 0 && (
                <div className="mt-1.5 bg-[#0d0d14] border border-white/[0.07] rounded-xl overflow-hidden">
                  {clientResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all text-left border-b border-white/[0.04] last:border-0 ${
                        clientHighlight === clientResults.indexOf(c)
                          ? "bg-orange-500/15 border-l-2 border-l-orange-500"
                          : "hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-orange-500/15 flex items-center justify-center text-xs font-bold text-orange-400 flex-shrink-0">
                        {c.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white/80 font-medium truncate">{c.name}</div>
                        <div className="text-xs text-white/30 truncate">{c.phone ?? c.email ?? ""}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-white/20 uppercase tracking-widest">ou dicter</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Textarea */}
            <div>
              <textarea
                ref={textareaRef}
                rows={5}
                className="w-full bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] focus:border-white/20 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none resize-none transition-all leading-relaxed"
                placeholder={"client Jean 0612345678\nip14 ecran + batterie\ncode 1234"}
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleExtract(); } }}
              />
              {interimText && (
                <p className="mt-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-lg text-xs text-white/30 italic">{interimText}</p>
              )}
              {isListening && (
                <div className="flex items-center gap-2 mt-2 text-xs text-red-400/80">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
                  Écoute — {countdown}s
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={toggleListening}
                title={isListening ? "Arrêter" : "Dicter"}
                className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all text-base ${
                  isListening
                    ? "bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse"
                    : "bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] hover:border-white/15 text-white/40 hover:text-white/70"
                }`}
              >
                🎤
              </button>
              <button
                onClick={handleExtract}
                disabled={!aiText.trim() || aiLoading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-25 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-semibold transition-all tracking-tight"
              >
                {aiLoading ? "Analyse en cours…" : "Analyser et remplir →"}
              </button>
            </div>

            <p className="text-center text-[10px] text-white/15 select-none">Ctrl+Entrée pour analyser</p>
          </div>
        </div>
      )}
    </>
  );
}
