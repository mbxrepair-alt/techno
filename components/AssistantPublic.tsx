"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME: Omit<Message, "timestamp"> = {
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant MBX Mobilax 👋\n\nJe suis là pour répondre à vos questions sur vos appareils et nos services de réparation.\n\nComment puis-je vous aider ?",
};

const SUGGESTIONS = [
  "Problème de charge",
  "Problème d'affichage",
  "Problème réseau",
  "Mon téléphone est tombé dans l'eau",
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function AssistantPublic() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { ...WELCOME, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    } else {
      stopListening();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function stopListening() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;

    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
      }
    };
    rec.onend = () => { setIsListening(false); recognitionRef.current = null; };
    rec.onerror = () => { setIsListening(false); recognitionRef.current = null; };

    rec.start();
    setIsListening(true);
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isTyping) return;

    setInput("");
    stopListening();

    const userMsg: Message = { role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history = messages
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/assistant-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content }],
        }),
      });

      const data = await res.json();
      const reply = data?.response ?? "Désolé, je n'ai pas pu répondre. Appelez-nous au 04 72 60 16 13.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, timestamp: new Date() },
      ]);

      if (!isOpen) setHasUnread(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Désolé, je suis temporairement indisponible. Appelez-nous au 04 72 60 16 13.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const showSuggestions = messages.length === 1;

  return (
    <>
      {/* ── SLIDE-IN PANEL ── */}
      <div
        className={`fixed bottom-[88px] right-4 z-50 w-[380px] max-w-[calc(100vw-32px)] transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ height: "min(580px, calc(100dvh - 120px))" }}
      >
        <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-orange-500/30 shadow-[0_8px_60px_rgba(249,115,22,0.25),0_0_0_1px_rgba(255,255,255,0.05)] bg-gray-950/95 backdrop-blur-2xl">

          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg shadow-inner backdrop-blur-sm border border-white/20">
                🤖
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Assistant MBX</p>
                <p className="text-orange-100 text-[10px] leading-tight">Posez vos questions sur vos réparations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
                <span className="text-[10px] text-green-200 font-medium">En ligne</span>
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700">

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm flex-shrink-0 mt-0.5 shadow-md">
                    🤖
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm shadow-md"
                        : "bg-gray-800/80 text-gray-100 rounded-tl-sm border border-gray-700/50"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-600 px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm flex-shrink-0 mt-0.5 shadow-md">
                  🤖
                </div>
                <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0ms]"></span>
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* SUGGESTIONS */}
          {showSuggestions && (
            <div className="px-4 pb-3 flex flex-col gap-1.5 flex-shrink-0">
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Questions fréquentes</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/60 text-orange-300 transition-all duration-150 active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT */}
          <div className="px-4 py-3 border-t border-gray-800/80 flex-shrink-0 bg-gray-950/60">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-gray-800/60 border border-gray-700/60 rounded-xl px-3.5 py-2.5 focus-within:border-orange-500/60 focus-within:bg-gray-800/80 transition-all duration-150">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Votre question..."
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
                  disabled={isTyping}
                />
                <button
                  onClick={toggleListening}
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                    isListening
                      ? "bg-red-500/20 text-red-400 animate-pulse"
                      : "text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                  }`}
                  title={isListening ? "Arrêter" : "Dicter"}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-md hover:from-orange-400 hover:to-orange-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-600 mt-2">
              8 Rue de l'Épée, Lyon • 04 72 60 16 13
            </p>
          </div>
        </div>
      </div>

      {/* ── FLOATING BUTTON ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-2xl font-bold text-sm text-white transition-all duration-300 shadow-[0_4px_30px_rgba(249,115,22,0.5)] hover:shadow-[0_6px_40px_rgba(249,115,22,0.7)] hover:scale-105 active:scale-95 ${
          isOpen
            ? "bg-gradient-to-r from-orange-700 to-orange-600"
            : "bg-gradient-to-r from-orange-500 to-orange-600"
        }`}
      >
        {/* Orange glow ring */}
        <span className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 hover:opacity-30 blur-sm transition-opacity duration-300 pointer-events-none"></span>

        <span className="relative flex items-center gap-2.5">
          <span className="text-xl leading-none">{isOpen ? "✕" : "🤖"}</span>
          <span className="tracking-wide">
            {isOpen ? "Fermer" : "Assistant MBX"}
          </span>
          {!isOpen && hasUnread && (
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-black flex items-center justify-center text-[9px] font-black">
              !
            </span>
          )}
          {!isOpen && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]"></span>
            </span>
          )}
        </span>
      </button>
    </>
  );
}
