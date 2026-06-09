"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithAssistant, extractFormDataFromText } from "../lib/ai";
import type { ExtractedFormData } from "../lib/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: "📊 Stats du jour", message: "Donne-moi les tarifs et statistiques du jour" },
  { label: "🔧 Réparations en cours", message: "Quelles sont les réparations les plus courantes ?" },
  { label: "💰 Paiements en attente", message: "Quels sont les tarifs et devis disponibles ?" },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const WELCOME: Omit<Message, "timestamp"> = {
  role: "assistant",
  content:
    "Bonjour ! Je suis votre assistant MBX Mobilax 🔧\n\nJe peux vous aider avec :\n• Diagnostics et prix de réparation\n• Informations techniques\n• Tarifs et devis\n\nComment puis-je vous aider ?",
};

export default function AssistantPro() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { ...WELCOME, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fill-form state
  const [fillMode, setFillMode] = useState(false);
  const [fillText, setFillText] = useState("");
  const [fillInterimText, setFillInterimText] = useState("");
  const [fillCountdown, setFillCountdown] = useState(60);
  const [fillLoading, setFillLoading] = useState(false);
  const [fillResult, setFillResult] = useState<ExtractedFormData | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fillTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fillSilenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFillSpeechRef = useRef<number>(0);

  // Chat voice state
  const [isChatListening, setIsChatListening] = useState(false);
  const [chatCountdown, setChatCountdown] = useState(60);
  const chatRecognitionRef = useRef<any>(null);
  const chatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatSilenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastChatSpeechRef = useRef<number>(0);
  const baseSpeechRef = useRef("");

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      if (!fillMode) {
        const t = setTimeout(() => inputRef.current?.focus(), 300);
        return () => clearTimeout(t);
      }
    } else {
      stopFillRecording("manual");
      stopChatRecording("manual");
    }
  }, [isOpen, fillMode]);

  useEffect(() => {
    if (!fillMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, fillMode]);

  // ── CHAT ──

  const send = async (text?: string) => {
    const content = (text !== undefined ? text : input).trim();
    if (!content || isTyping) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMsg: Message = { role: "user", content, timestamp: new Date() };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await chatWithAssistant(content, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response, timestamp: new Date() },
      ]);
      if (!isOpen) setHasUnread(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Une erreur technique est survenue. Veuillez réessayer.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const resetConversation = () => {
    setMessages([{ ...WELCOME, timestamp: new Date() }]);
    stopFillRecording("manual");
    stopChatRecording("manual");
    setFillMode(false);
    setFillText("");
    setFillResult(null);
  };

  // ── FILL FORM ──

  const stopFillRecording = (reason: "manual" | "timeout" | "silence" = "manual") => {
    recognitionRef.current?.stop();
    if (fillTimerRef.current) { clearInterval(fillTimerRef.current); fillTimerRef.current = null; }
    if (fillSilenceRef.current) { clearInterval(fillSilenceRef.current); fillSilenceRef.current = null; }
    setIsListening(false);
    setFillInterimText("");
    setFillCountdown(60);
    if (reason === "timeout") {
      setFillText((prev) => (prev.trim() ? prev.trimEnd() + " " : "") + "✅ Enregistrement terminé");
    }
  };

  const toggleListening = () => {
    if (isListening) { stopFillRecording("manual"); return; }

    const SR =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SR) {
      setFillText((prev) => (prev ? prev + " " : "") + "[Micro non supporté dans ce navigateur]");
      return;
    }

    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: any) => {
      lastFillSpeechRef.current = Date.now();
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript as string;
        if (e.results[i].isFinal) {
          setFillText((prev) => (prev ? prev + " " + t : t));
        } else {
          interim += t;
        }
      }
      setFillInterimText(interim);
    };
    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") stopFillRecording("manual");
    };
    recognition.onend = () => {
      setIsListening(false);
      setFillInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setFillCountdown(60);
    lastFillSpeechRef.current = Date.now();

    let remaining = 60;
    fillTimerRef.current = setInterval(() => {
      remaining -= 1;
      setFillCountdown(remaining);
      if (remaining <= 0) stopFillRecording("timeout");
    }, 1000);

    fillSilenceRef.current = setInterval(() => {
      if (Date.now() - lastFillSpeechRef.current > 5000) stopFillRecording("silence");
    }, 500);
  };

  const handleExtract = async () => {
    if (!fillText.trim() || fillLoading) return;
    setFillLoading(true);
    try {
      const result = await extractFormDataFromText(fillText.trim());
      setFillResult(result);
    } finally {
      setFillLoading(false);
    }
  };

  const handleConfirmFill = () => {
    if (!fillResult) return;
    window.dispatchEvent(new CustomEvent("assistant:fillForm", { detail: fillResult }));
    const repairCount = fillResult.repairs.filter((r) => r.device || r.issue).length;
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `✅ Formulaire pré-rempli !\n\n👤 ${fillResult.clientName ?? "Client"} (${fillResult.clientType})\n🔧 ${repairCount} appareil(s) détecté(s)\n\nLes champs ont été remplis automatiquement.`,
        timestamp: new Date(),
      },
    ]);
    stopFillRecording("manual");
    setFillMode(false);
    setFillText("");
    setFillResult(null);
  };

  const handleCancelFill = () => {
    stopFillRecording("manual");
    setFillMode(false);
    setFillText("");
    setFillResult(null);
  };

  // ── CHAT VOICE INPUT ──

  const stopChatRecording = (_reason: "manual" | "timeout" | "silence" = "manual") => {
    chatRecognitionRef.current?.stop();
    if (chatTimerRef.current) { clearInterval(chatTimerRef.current); chatTimerRef.current = null; }
    if (chatSilenceRef.current) { clearInterval(chatSilenceRef.current); chatSilenceRef.current = null; }
    setIsChatListening(false);
    setChatCountdown(60);
  };

  const toggleChatListening = () => {
    if (isChatListening) { stopChatRecording("manual"); return; }

    const SR =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SR) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ La reconnaissance vocale n'est pas supportée par votre navigateur.\nUtilisez **Chrome** ou **Edge** pour dicter vos messages.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    baseSpeechRef.current = input.trim();
    lastChatSpeechRef.current = Date.now();

    recognition.onresult = (e: any) => {
      lastChatSpeechRef.current = Date.now();
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript as string;
        if (e.results[i].isFinal) {
          baseSpeechRef.current = baseSpeechRef.current
            ? baseSpeechRef.current + " " + t
            : t;
        } else {
          interim += t;
        }
      }
      const base = baseSpeechRef.current;
      setInput(base ? (interim ? base + " " + interim : base) : interim);
    };
    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") stopChatRecording("manual");
    };
    recognition.onend = () => {
      setIsChatListening(false);
      setChatCountdown(60);
    };

    chatRecognitionRef.current = recognition;
    recognition.start();
    setIsChatListening(true);
    setChatCountdown(60);

    let remaining = 60;
    chatTimerRef.current = setInterval(() => {
      remaining -= 1;
      setChatCountdown(remaining);
      if (remaining <= 0) stopChatRecording("timeout");
    }, 1000);

    chatSilenceRef.current = setInterval(() => {
      if (Date.now() - lastChatSpeechRef.current > 5000) stopChatRecording("silence");
    }, 500);
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 sm:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── Floating toggle button ── */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <>
            <span className="absolute inset-0 rounded-full bg-orange-500/50 animate-ping" />
            <span
              className="absolute inset-0 rounded-full bg-orange-400/25 animate-ping"
              style={{ animationDelay: "600ms" }}
            />
          </>
        )}
        <button
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? "Fermer l'assistant" : "Ouvrir l'assistant"}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.55)] hover:shadow-[0_0_50px_rgba(249,115,22,0.75)] hover:scale-110 active:scale-95 transition-all duration-300"
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <>
              <span className="text-xs font-black tracking-tight leading-none">✨ IA</span>
              {hasUnread && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-bounce" />
              )}
            </>
          )}
        </button>
      </div>

      {/* ── Slide-in panel ── */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] flex flex-col transition-all duration-300 ease-out ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-[#070711]/96 backdrop-blur-2xl border-l border-orange-500/20 shadow-[-30px_0_80px_rgba(0,0,0,0.7)]" />

        <div className="relative flex flex-col h-full">

          {/* ── HEADER ── */}
          <div className="flex-shrink-0 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 px-4 pt-4 pb-3 shadow-[0_6px_30px_rgba(249,115,22,0.4)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-white font-black text-base leading-tight tracking-tight">
                  ✨ Remplir formulaire
                </p>
                <span className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={resetConversation}
                  title="Nouvelle conversation"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Fermer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── HERO FILL FORM BUTTON ── */}
            <button
              onClick={() => {
                if (fillMode) {
                  handleCancelFill();
                } else {
                  setFillMode(true);
                  setFillResult(null);
                  setFillText("");
                }
              }}
              className={`w-full mb-2.5 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] ${
                fillMode
                  ? "bg-white/25 border-2 border-white/50 text-white"
                  : "bg-gradient-to-r from-white/30 to-white/15 hover:from-white/40 hover:to-white/25 border border-white/50 text-white shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] animate-pulse-slow"
              }`}
            >
              <span className="text-base">✨</span>
              <span className="text-[15px]">{fillMode ? "Fermer le formulaire" : "Remplir formulaire automatiquement"}</span>
              {!fillMode && (
                <span className="ml-auto text-[10px] bg-white/30 px-2 py-0.5 rounded-full font-black tracking-widest uppercase">
                  IA
                </span>
              )}
            </button>

            {/* Quick action pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => {
                    setFillMode(false);
                    send(a.message);
                  }}
                  disabled={isTyping}
                  className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border text-white transition-all duration-200 whitespace-nowrap bg-white/15 hover:bg-white/28 border-white/25 hover:border-white/50 disabled:opacity-40"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── FILL FORM MODE ── */}
          {fillMode ? (
            <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
              {!fillResult ? (
                <>
                  <div>
                    <p className="text-orange-400 text-sm font-semibold mb-1">✨ Remplir le formulaire</p>
                    <p className="text-gray-500 text-xs leading-relaxed">
                      Dictez ou tapez les infos client et appareil en langage naturel.{" "}
                      <span className="text-gray-400 italic">
                        Ex : « ip14 nsp cdc code 3432 client Jean 0612345678 »
                      </span>
                    </p>
                  </div>

                  <div>
                    <textarea
                      autoFocus
                      rows={5}
                      className="w-full bg-white/[0.06] border border-white/10 hover:border-orange-500/20 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none resize-none transition-all duration-200"
                      placeholder={"Exemple :\nClient Marie Martin 0698765432\nip13 pro ecr bat cdc 120€\nIMEI 123456789012345"}
                      value={fillText}
                      onChange={(e) => setFillText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleExtract();
                      }}
                    />
                    {/* Interim speech — shown below textarea while dictating */}
                    {fillInterimText && (
                      <div className="mt-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg">
                        <span className="text-xs text-gray-500 italic leading-relaxed">{fillInterimText}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {/* Mic button with countdown */}
                    <button
                      onClick={toggleListening}
                      title={isListening ? `Arrêter (${fillCountdown}s restantes)` : "Dicter jusqu'à 60s"}
                      className={`flex-shrink-0 h-11 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition-all duration-200 ${
                        isListening
                          ? "bg-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse px-3 min-w-[72px]"
                          : "bg-white/[0.07] border border-white/10 hover:bg-white/15 hover:border-orange-500/30 w-11"
                      }`}
                    >
                      <span className="text-lg leading-none">🎤</span>
                      {isListening && (
                        <span className="text-white text-xs tabular-nums">{fillCountdown}s</span>
                      )}
                    </button>

                    {/* Analyse button */}
                    <button
                      onClick={handleExtract}
                      disabled={!fillText.trim() || fillLoading}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-bold transition-all duration-200 shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]"
                    >
                      {fillLoading ? "⏳ Analyse..." : "🔍 Analyser"}
                    </button>

                    <button
                      onClick={handleCancelFill}
                      title="Fermer"
                      className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center text-gray-500 hover:text-white bg-white/[0.07] border border-white/10 hover:bg-white/15 transition-all duration-200"
                    >
                      ✕
                    </button>
                  </div>

                  {isListening && (
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
                      Écoute en cours — {fillCountdown}s restantes — arrêt auto après 5s de silence
                    </div>
                  )}

                  <p className="text-[10px] text-gray-700 text-center select-none">
                    Ctrl+Entrée pour analyser
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-orange-400 text-sm font-semibold">📋 Données extraites</p>
                    <button
                      onClick={() => setFillResult(null)}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      ✏️ Modifier
                    </button>
                  </div>

                  <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-3">
                    <p className="text-orange-400/80 text-[11px] font-semibold uppercase tracking-wider mb-2.5">
                      👤 Client
                    </p>
                    <div className="space-y-2">
                      {(
                        [
                          { label: "Nom", value: fillResult.clientName },
                          { label: "Téléphone", value: fillResult.clientPhone },
                          { label: "Email", value: fillResult.clientEmail },
                          { label: "Type", value: fillResult.clientType },
                        ] as const
                      ).map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center text-xs gap-4">
                          <span className="text-gray-500 flex-shrink-0">{label}</span>
                          <span className={value ? "text-gray-200 text-right" : "text-gray-600 italic"}>
                            {value ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {fillResult.repairs.map((r, i) => (
                    <div key={i} className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-3">
                      <p className="text-orange-400/80 text-[11px] font-semibold uppercase tracking-wider mb-2.5">
                        🔧 Appareil{fillResult.repairs.length > 1 ? ` #${i + 1}` : ""}
                      </p>
                      <div className="space-y-2">
                        {(
                          [
                            { label: "Modèle", value: r.device },
                            { label: "Panne", value: r.issue },
                            { label: "Prix estimé", value: r.estimatedPrice !== null ? `${r.estimatedPrice}€` : null },
                            { label: "IMEI", value: r.imei, mono: true },
                            { label: "Code", value: r.code },
                            { label: "Note", value: r.description },
                          ] as Array<{ label: string; value: string | null; mono?: boolean }>
                        ).map(({ label, value, mono }) => (
                          <div key={label} className="flex justify-between items-start gap-4 text-xs">
                            <span className="text-gray-500 flex-shrink-0">{label}</span>
                            <span className={[
                              "text-right break-all",
                              value ? "text-gray-200" : "text-gray-600 italic",
                              mono ? "font-mono" : "",
                            ].join(" ")}>
                              {value ?? "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1 pb-2">
                    <button
                      onClick={handleConfirmFill}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl py-3 text-sm font-bold transition-all duration-200 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                    >
                      ✅ Remplir
                    </button>
                    <button
                      onClick={handleCancelFill}
                      className="flex-1 bg-white/[0.07] border border-white/10 hover:bg-white/15 text-gray-300 rounded-xl py-3 text-sm font-semibold transition-all duration-200"
                    >
                      ❌ Annuler
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── MESSAGES ── */
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
              {messages.length === 1 && (
                <p className="text-center text-[11px] text-gray-500 leading-relaxed px-2">
                  Tapez ou dictez les infos du client pour remplir le formulaire automatiquement
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-sm flex-shrink-0 mb-4">
                      🤖
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-2xl rounded-tr-none bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_4px_20px_rgba(249,115,22,0.3)]"
                        : "rounded-2xl rounded-tl-none bg-white/[0.07] text-gray-200 border border-white/[0.09] shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 mt-1.5 px-1 select-none">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-sm flex-shrink-0 mb-4">
                      👤
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-sm flex-shrink-0">
                    🤖
                  </div>
                  <div className="bg-white/[0.07] border border-white/[0.09] px-4 py-3 rounded-2xl rounded-tl-none shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                    <div className="flex gap-1.5 items-center h-4">
                      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ── INPUT (chat mode only) ── */}
          {!fillMode && (
            <div className="flex-shrink-0 border-t border-white/[0.07] p-4 bg-black/30 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (!isChatListening) baseSpeechRef.current = e.target.value;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      stopChatRecording("manual");
                      send();
                    }
                  }}
                  placeholder={isChatListening ? "Parlez maintenant…" : "Posez votre question..."}
                  disabled={isTyping}
                  className={`flex-1 bg-white/[0.06] border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-200 disabled:opacity-40 ${
                    isChatListening
                      ? "border-red-500/60 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/20"
                      : "border-white/10 hover:border-orange-500/30 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
                  }`}
                />

                {/* Chat mic with countdown */}
                <button
                  onClick={toggleChatListening}
                  disabled={isTyping}
                  title={isChatListening ? `Arrêter (${chatCountdown}s)` : "Dicter un message (60s max)"}
                  aria-label={isChatListening ? "Arrêter le micro" : "Activer le micro"}
                  className={`flex-shrink-0 h-10 rounded-xl flex items-center justify-center gap-1 transition-all duration-200 disabled:opacity-30 ${
                    isChatListening
                      ? "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.6)] animate-pulse px-2 min-w-[54px]"
                      : "bg-white/[0.07] border border-white/10 hover:bg-white/15 hover:border-orange-500/30 hover:scale-105 active:scale-95 w-10"
                  }`}
                >
                  <span className="text-sm leading-none">🎤</span>
                  {isChatListening && (
                    <span className="text-white text-xs font-bold tabular-nums">{chatCountdown}s</span>
                  )}
                </button>

                <button
                  onClick={() => { stopChatRecording("manual"); send(); }}
                  disabled={!input.trim() || isTyping}
                  aria-label="Envoyer"
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:scale-100 disabled:shadow-none"
                >
                  <svg className="w-4 h-4" style={{ transform: "rotate(-45deg) translateY(-1px)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>

              {isChatListening && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                  <span className="text-[11px] text-red-400">
                    Écoute — {chatCountdown}s restantes — silence 5s pour arrêter
                  </span>
                </div>
              )}

              <p className="text-center text-[10px] text-gray-700 mt-2 select-none tracking-wide">
                MBX MOBILAX • Assistant IA réparations
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
