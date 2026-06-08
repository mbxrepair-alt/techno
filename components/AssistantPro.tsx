"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithAssistant } from "../lib/ai";

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

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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
              <span className="text-2xl leading-none">🤖</span>
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
        {/* Glassmorphism layer */}
        <div className="absolute inset-0 bg-[#070711]/96 backdrop-blur-2xl border-l border-orange-500/20 shadow-[-30px_0_80px_rgba(0,0,0,0.7)]" />

        <div className="relative flex flex-col h-full">

          {/* ── HEADER ── */}
          <div className="flex-shrink-0 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 px-4 pt-4 pb-3 shadow-[0_6px_30px_rgba(249,115,22,0.4)]">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 backdrop-blur-sm flex items-center justify-center text-xl shadow-inner">
                    🤖
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-orange-500 shadow-[0_0_8px_rgba(74,222,128,0.9)] animate-pulse" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight tracking-wide">
                    Assistant MBX Pro
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-orange-100/90 text-[11px] font-medium">
                      En ligne • MBX Mobilax
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={resetConversation}
                  title="Nouvelle conversation"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
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

            {/* Quick action pills */}
            <div
              className="flex gap-1.5 overflow-x-auto pb-0.5"
              style={{ scrollbarWidth: "none" }}
            >
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => send(a.message)}
                  disabled={isTyping}
                  className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/28 border border-white/25 hover:border-white/50 text-white transition-all duration-200 disabled:opacity-40 whitespace-nowrap"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── MESSAGES ── */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* AI avatar */}
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-sm flex-shrink-0 mb-4">
                    🤖
                  </div>
                )}

                <div
                  className={`flex flex-col max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-2xl rounded-tr-none bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_4px_20px_rgba(249,115,22,0.3)]"
                        : "rounded-2xl rounded-tl-none bg-white/[0.07] text-gray-200 border border-white/[0.09] shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 mt-1.5 px-1 select-none">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {/* User avatar */}
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-sm flex-shrink-0 mb-4">
                    👤
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-sm flex-shrink-0">
                  🤖
                </div>
                <div className="bg-white/[0.07] border border-white/[0.09] px-4 py-3 rounded-2xl rounded-tl-none shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <div className="flex gap-1.5 items-center h-4">
                    <span
                      className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── INPUT ── */}
          <div className="flex-shrink-0 border-t border-white/[0.07] p-4 bg-black/30 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Posez votre question..."
                disabled={isTyping}
                className="flex-1 bg-white/[0.06] border border-white/10 hover:border-orange-500/30 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-200 disabled:opacity-40"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || isTyping}
                aria-label="Envoyer"
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:scale-100 disabled:shadow-none"
              >
                <svg
                  className="w-4 h-4"
                  style={{ transform: "rotate(-45deg) translateY(-1px)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-700 mt-2.5 select-none tracking-wide">
              MBX MOBILAX • Assistant IA réparations
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
