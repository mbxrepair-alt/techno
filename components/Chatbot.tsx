"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithAssistant } from "../lib/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "🔧 Bonjour ! Je suis l'assistant technique MBX. Je peux vous aider avec :\n\n📱 Diagnostic de pannes\n🔧 Suggestions de réparation\n💰 Estimations de prix\n🛠️ Solutions techniques\n\nComment puis-je vous aider aujourd'hui ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;
    const userMessage: Message = { role: "user", content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsTyping(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const response = await chatWithAssistant(input, messages);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response, timestamp: Date.now() },
      ]);
    } catch (error) {
      console.error("Erreur chatbot:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Désolé, une erreur technique est survenue. Veuillez réessayer.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden animate-slide-up">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="text-2xl">🤖</span>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          </div>
          <div>
            <h3 className="text-white font-semibold">Assistant MBX</h3>
            <p className="text-purple-200 text-xs">IA technique • Disponible 24/7</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setMessages([
                {
                  role: "assistant",
                  content: "🔧 Nouvelle conversation ! Comment puis-je vous aider ?",
                },
              ])
            }
            className="text-white hover:text-gray-200 text-sm px-2 py-1 rounded-lg hover:bg-white/20 transition"
            title="Nouvelle conversation"
          >
            🗑️
          </button>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-xl leading-5">
            ✕
          </button>
        </div>
      </div>
      <div className="h-96 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3 animate-fade-in`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === "user" ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-none" : "bg-white text-gray-800 rounded-bl-none shadow-md border border-gray-100"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1 mb-1 text-xs text-purple-500">
                  <span>🤖</span>
                  <span>Assistant MBX</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start mb-3">
            <div className="bg-white p-3 rounded-xl shadow-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-3 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
