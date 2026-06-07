"use client";

import { useState, useEffect, useRef } from "react";
import { chatWithAssistant } from "../lib/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RepairDetection {
  device: string;
  issue: string;
  estimatedPrice: number;
}

interface AnalysisResult {
  type: "single" | "multi";
  device?: string;
  issue?: string;
  estimatedPrice?: number;
  repairs?: RepairDetection[];
}

interface SmartChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onPreFillForm?: (data: RepairDetection) => void;
  onPreFillMultiRepairs?: (repairs: RepairDetection[]) => void;
}

export default function SmartChatbot({ isOpen, onClose, onPreFillForm, onPreFillMultiRepairs }: SmartChatbotProps): JSX.Element | null {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "🔧 **Assistant MBX - Mode Remplissage Auto**\n\nJe peux vous aider à créer rapidement des réparations !\n\n📱 **Exemples :**\n- \"iPhone 14 écran cassé\"\n- \"Samsung S22 batterie faible\"\n\n💡 **Dites-moi simplement l'appareil et la panne !**" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedData, setDetectedData] = useState<RepairDetection | null>(null);
  const [detectedMultiRepairs, setDetectedMultiRepairs] = useState<RepairDetection[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  const analyzeSingleDevice = (msg: string): RepairDetection => {
    const result: RepairDetection = { device: "", issue: "", estimatedPrice: 0 };
    if (msg.includes("iphone")) {
      if (msg.includes("14")) result.device = "iPhone 14";
      else if (msg.includes("13")) result.device = "iPhone 13";
      else if (msg.includes("12")) result.device = "iPhone 12";
      else if (msg.includes("11")) result.device = "iPhone 11";
      else result.device = "iPhone";
    }
    if (msg.includes("samsung") || msg.includes("galaxy")) {
      result.device = msg.includes("s23") ? "Samsung Galaxy S23" : msg.includes("s22") ? "Samsung Galaxy S22" : "Samsung Galaxy";
    }
    if (msg.includes("xiaomi") || msg.includes("redmi")) result.device = "Xiaomi/Redmi";
    if (msg.includes("ipad") || msg.includes("tablette")) result.device = "Tablette";
    if (msg.includes("ps5")) result.device = "PlayStation 5";
    if (msg.includes("xbox")) result.device = "Xbox Series";
    if (msg.includes("écran") || msg.includes("cassé") || msg.includes("vitre")) {
      result.issue = "Écran cassé / fissuré";
      result.estimatedPrice = result.device.includes("iPhone 14") ? 229 : result.device.includes("iPhone 13") ? 199 : result.device.includes("iPhone 12") ? 169 : 89;
    } else if (msg.includes("batterie")) {
      result.issue = "Batterie qui se décharge trop vite";
      result.estimatedPrice = result.device.includes("iPhone 14") ? 89 : result.device.includes("iPhone 13") ? 79 : 59;
    } else if (msg.includes("charge") || msg.includes("port")) {
      result.issue = "Port de charge défectueux"; result.estimatedPrice = 49;
    } else if (msg.includes("allume") || msg.includes("marche")) {
      result.issue = "Ne s'allume pas"; result.estimatedPrice = 45;
    }
    return result;
  };

  const analyzeMessage = (message: string): AnalysisResult => {
    const msg = message.toLowerCase();
    const multiMatch = msg.match(/(\d+)\s*(appareils?|appareil)/i);
    if (multiMatch && msg.includes("+")) {
      const devices = msg.split(/[+,et]/).map(part => analyzeSingleDevice(part)).filter(r => r.device);
      if (devices.length > 0) return { type: "multi", repairs: devices };
    }
    return { type: "single", ...analyzeSingleDevice(msg) };
  };

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: input }]);
    setInput("");
    setLoading(true);
    try {
      const analysis = analyzeMessage(input);
      if (analysis.type === "multi" && analysis.repairs?.length) {
        setDetectedMultiRepairs(analysis.repairs);
        const list = analysis.repairs.map((r, i) => `\n${i + 1}. 📱 ${r.device} - ${r.issue} (${r.estimatedPrice}€)`).join('');
        setMessages(prev => [...prev, { role: "assistant", content: `🔍 **J'ai détecté ${analysis.repairs!.length} appareils :**${list}\n\n✅ Cliquez sur **"Remplir tous les appareils"** ci-dessous.` }]);
        setDetectedData(null);
      } else if (analysis.device && analysis.issue) {
        const data = { device: analysis.device, issue: analysis.issue, estimatedPrice: analysis.estimatedPrice ?? 0 };
        setDetectedData(data);
        setDetectedMultiRepairs([]);
        setMessages(prev => [...prev, { role: "assistant", content: `🔍 **J'ai détecté :**\n\n📱 **Appareil :** ${data.device}\n🛠️ **Panne :** ${data.issue}\n💰 **Estimation :** ${data.estimatedPrice}€\n\n✅ Cliquez sur **"Remplir le formulaire"** ci-dessous.` }]);
      } else {
        const response = await chatWithAssistant(input);
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Désolé, je n'ai pas compris. Essayez : 'iPhone 14 écran cassé'" }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-orange-200 overflow-hidden animate-slide-up">
      <div className="bg-gradient-to-r from-orange-600 to-pink-600 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div><h3 className="text-white font-semibold">Assistant MBX</h3><p className="text-orange-200 text-xs">Mode remplissage auto</p></div>
        </div>
        <button onClick={onClose} className="text-white text-xl">✕</button>
      </div>
      <div className="h-80 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === "user" ? "bg-orange-500 text-white rounded-br-none" : "bg-white text-gray-800 rounded-bl-none shadow"}`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start mb-3"><div className="bg-white p-3 rounded-xl shadow"><div className="flex gap-1"><div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce delay-200"></div></div></div></div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="px-3 py-2 bg-gray-50 border-t">
        <div className="flex flex-wrap gap-2">
          {["iPhone 14 écran cassé", "Samsung S22 batterie", "iPad ne s'allume pas"].map((sugg, idx) => (
            <button key={idx} onClick={() => { setInput(sugg); inputRef.current?.focus(); }} className="text-xs bg-white border rounded-full px-3 py-1 hover:border-orange-300">{sugg}</button>
          ))}
        </div>
      </div>
      <div className="border-t p-3 bg-white">
        <div className="flex gap-2">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="🔧 Décrivez l'appareil et la panne..." className="flex-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500" onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()} />
          <button onClick={sendMessage} disabled={loading} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm">Envoyer</button>
        </div>
      </div>
      {detectedData?.device && (
        <div className="border-t p-3 bg-orange-50">
          <button onClick={() => { onPreFillForm?.(detectedData!); onClose(); }} className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold">📝 Remplir le formulaire</button>
        </div>
      )}
      {detectedMultiRepairs.length > 0 && (
        <div className="border-t p-3 bg-orange-50">
          <button onClick={() => { onPreFillMultiRepairs?.(detectedMultiRepairs); onClose(); }} className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold">📝 Remplir {detectedMultiRepairs.length} appareils</button>
        </div>
      )}
    </div>
  );
}
