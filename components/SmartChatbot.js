"use client";

import { useState, useEffect, useRef } from "react";
import { chatWithAssistant } from "../lib/ai";

export default function SmartChatbot({ 
  isOpen, 
  onClose, 
  onPreFillForm,
  onPreFillMultiRepairs 
}) {
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: "🔧 **Assistant MBX - Mode Remplissage Auto**\n\nJe peux vous aider à créer rapidement des réparations !\n\n📱 **Exemples :**\n- \"iPhone 14 écran cassé\"\n- \"Samsung S22 batterie faible\"\n- \"2 appareils : iPhone 14 écran cassé + Samsung S22 batterie\"\n- \"iPad ne s'allume pas\"\n\n💡 **Dites-moi simplement l'appareil et la panne, je remplirai le formulaire pour vous !**" 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedData, setDetectedData] = useState(null);
  const [detectedMultiRepairs, setDetectedMultiRepairs] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Analyse intelligente du message pour extraire les infos
  const analyzeMessage = (message) => {
    const msg = message.toLowerCase();
    
    // Détection multi-appareils (ex: "2 appareils : iPhone 14 + Samsung S22")
    const multiMatch = msg.match(/(\d+)\s*(appareils?|appareil)/i);
    if (multiMatch && msg.includes("+")) {
      const devices = [];
      const parts = msg.split(/[+,et]/);
      for (const part of parts) {
        const result = analyzeSingleDevice(part);
        if (result.device) devices.push(result);
      }
      if (devices.length > 0) return { type: "multi", repairs: devices };
    }
    
    // Détection simple
    return { type: "single", ...analyzeSingleDevice(msg) };
  };

  const analyzeSingleDevice = (msg) => {
    const result = { device: "", issue: "", estimatedPrice: 0 };
    
    // Détection iPhone
    if (msg.includes("iphone")) {
      if (msg.includes("14")) result.device = "iPhone 14";
      else if (msg.includes("13")) result.device = "iPhone 13";
      else if (msg.includes("12")) result.device = "iPhone 12";
      else if (msg.includes("11")) result.device = "iPhone 11";
      else result.device = "iPhone";
    }
    
    // Détection Samsung
    if (msg.includes("samsung") || msg.includes("galaxy")) {
      if (msg.includes("s23")) result.device = "Samsung Galaxy S23";
      else if (msg.includes("s22")) result.device = "Samsung Galaxy S22";
      else result.device = "Samsung Galaxy";
    }
    
    // Détection Xiaomi
    if (msg.includes("xiaomi") || msg.includes("redmi")) {
      result.device = "Xiaomi/Redmi";
    }
    
    // Détection tablette
    if (msg.includes("ipad") || msg.includes("tablette")) {
      result.device = "Tablette";
    }
    
    // Détection console
    if (msg.includes("ps5")) result.device = "PlayStation 5";
    if (msg.includes("xbox")) result.device = "Xbox Series";
    
    // Détection panne
    if (msg.includes("écran") || msg.includes("cassé") || msg.includes("vitre")) {
      result.issue = "Écran cassé / fissuré";
      result.estimatedPrice = result.device.includes("iPhone 14") ? 229 : 
                              result.device.includes("iPhone 13") ? 199 :
                              result.device.includes("iPhone 12") ? 169 : 89;
    }
    else if (msg.includes("batterie")) {
      result.issue = "Batterie qui se décharge trop vite";
      result.estimatedPrice = result.device.includes("iPhone 14") ? 89 :
                              result.device.includes("iPhone 13") ? 79 :
                              result.device.includes("iPhone 12") ? 69 : 59;
    }
    else if (msg.includes("charge") || msg.includes("port")) {
      result.issue = "Port de charge défectueux";
      result.estimatedPrice = 49;
    }
    else if (msg.includes("allume") || msg.includes("marche")) {
      result.issue = "Ne s'allume pas";
      result.estimatedPrice = 45;
    }
    
    return result;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const analysis = analyzeMessage(input);
      
      if (analysis.type === "multi" && analysis.repairs?.length > 0) {
        // Multi-appareils détectés
        setDetectedMultiRepairs(analysis.repairs);
        const repairsList = analysis.repairs.map((r, i) => `\n${i+1}. 📱 ${r.device} - ${r.issue} (${r.estimatedPrice}€)`).join('');
        const detectedMsg = `🔍 **J'ai détecté ${analysis.repairs.length} appareils :**${repairsList}\n\n✅ **Je peux remplir le formulaire avec tous ces appareils !**\n\nCliquez sur **\"Remplir tous les appareils\"** ci-dessous.`;
        setMessages(prev => [...prev, { role: "assistant", content: detectedMsg }]);
        setDetectedData(null);
      } 
      else if (analysis.device && analysis.issue) {
        // Appareil unique détecté
        setDetectedData(analysis);
        setDetectedMultiRepairs([]);
        const detectedMsg = `🔍 **J'ai détecté :**\n\n📱 **Appareil :** ${analysis.device}\n🛠️ **Panne :** ${analysis.issue}\n💰 **Estimation :** ${analysis.estimatedPrice}€\n\n✅ **Je peux remplir le formulaire pour vous !**\n\nCliquez sur **\"Remplir le formulaire\"** ci-dessous.`;
        setMessages(prev => [...prev, { role: "assistant", content: detectedMsg }]);
      } 
      else {
        const response = await chatWithAssistant(input);
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "❌ Désolé, je n'ai pas compris. Essayez : 'iPhone 14 écran cassé'" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const fillFormAndClose = () => {
    if (onPreFillForm && detectedData) {
      onPreFillForm(detectedData);
    }
    onClose();
  };

  const fillMultiRepairsAndClose = () => {
    if (onPreFillMultiRepairs && detectedMultiRepairs.length > 0) {
      onPreFillMultiRepairs(detectedMultiRepairs);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-orange-200 overflow-hidden animate-slide-up">
      <div className="bg-gradient-to-r from-orange-600 to-pink-600 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-white font-semibold">Assistant MBX</h3>
            <p className="text-orange-200 text-xs">Mode remplissage auto</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white text-xl">✕</button>
      </div>
      
      <div className="h-96 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
              msg.role === "user"
                ? "bg-orange-500 text-white rounded-br-none"
                : "bg-white text-gray-800 rounded-bl-none shadow"
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-white p-3 rounded-xl shadow">
              <div className="flex gap-1"><div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce delay-200"></div></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-2 bg-gray-50 border-t">
        <div className="flex flex-wrap gap-2">
          {["iPhone 14 écran cassé", "Samsung S22 batterie", "2 appareils : iPhone 14 écran + Samsung S22 batterie", "iPad ne s'allume pas"].map((sugg, idx) => (
            <button key={idx} onClick={() => { setInput(sugg); inputRef.current?.focus(); }} className="text-xs bg-white border rounded-full px-3 py-1 hover:border-orange-300">{sugg}</button>
          ))}
        </div>
      </div>

      <div className="border-t p-3 bg-white">
        <div className="flex gap-2">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="🔧 Décrivez l'appareil et la panne..." className="flex-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500" onKeyPress={(e) => e.key === "Enter" && !loading && sendMessage()} />
          <button onClick={sendMessage} disabled={loading} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm">Envoyer</button>
        </div>
      </div>

      {detectedData && detectedData.device && (
        <div className="border-t p-3 bg-orange-50">
          <button onClick={fillFormAndClose} className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold">📝 Remplir le formulaire</button>
        </div>
      )}

      {detectedMultiRepairs.length > 0 && (
        <div className="border-t p-3 bg-orange-50">
          <button onClick={fillMultiRepairsAndClose} className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold">📝 Remplir {detectedMultiRepairs.length} appareils</button>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}