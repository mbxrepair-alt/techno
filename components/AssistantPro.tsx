"use client";

import { useState, useRef, useEffect } from "react";
import { extractFormDataFromText } from "../lib/ai";
import type { ExtractedFormData } from "../lib/ai";

export default function AssistantPro() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedFormData | null>(null);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpeechRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) stopRecording();
  }, [isOpen]);

  const stopRecording = (reason: "manual" | "timeout" | "silence" = "manual") => {
    recognitionRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (silenceRef.current) { clearInterval(silenceRef.current); silenceRef.current = null; }
    setIsListening(false);
    setInterimText("");
    setCountdown(60);
    if (reason === "timeout") setText((p) => p.trimEnd() + " ✅");
  };

  const toggleListening = () => {
    if (isListening) { stopRecording(); return; }

    const SR = typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
    if (!SR) return;

    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      lastSpeechRef.current = Date.now();
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript as string;
        if (e.results[i].isFinal) setText((p) => p ? p + " " + t : t);
        else interim += t;
      }
      setInterimText(interim);
    };
    rec.onerror = (e: any) => { if (e.error !== "aborted") stopRecording(); };
    rec.onend = () => { setIsListening(false); setInterimText(""); };

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
    setCountdown(60);
    lastSpeechRef.current = Date.now();

    let r = 60;
    timerRef.current = setInterval(() => { r--; setCountdown(r); if (r <= 0) stopRecording("timeout"); }, 1000);
    silenceRef.current = setInterval(() => { if (Date.now() - lastSpeechRef.current > 5000) stopRecording("silence"); }, 500);
  };

  const handleExtract = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      setResult(await extractFormDataFromText(text.trim()));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    window.dispatchEvent(new CustomEvent("assistant:fillForm", { detail: result }));
    reset();
    setIsOpen(false);
  };

  const reset = () => { stopRecording(); setText(""); setResult(null); };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow-[0_8px_30px_rgba(249,115,22,0.5)] hover:shadow-[0_8px_40px_rgba(249,115,22,0.7)] hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <span className="text-base">✨</span>
        Remplir formulaire
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full sm:w-[420px] bg-[#0c0c1a] border border-orange-500/20 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-600 to-amber-500">
              <span className="text-white font-black text-sm tracking-tight">✨ Remplir formulaire</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {!result ? (
                <>
                  {/* Textarea */}
                  <div>
                    <textarea
                      autoFocus
                      rows={5}
                      className="w-full bg-white/[0.06] border border-white/10 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none resize-none transition-all duration-200"
                      placeholder={"ip14 ecran + batterie&#10;client Jean 0612345678&#10;code 1234"}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleExtract(); }}
                    />
                    {interimText && (
                      <p className="mt-1.5 px-3 py-1.5 bg-white/[0.04] rounded-lg text-xs text-gray-500 italic">{interimText}</p>
                    )}
                    {isListening && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                        Écoute — {countdown}s
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={toggleListening}
                      className={`h-11 w-11 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        isListening
                          ? "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.5)] animate-pulse"
                          : "bg-white/[0.07] border border-white/10 hover:bg-white/15"
                      }`}
                    >
                      🎤
                    </button>
                    <button
                      onClick={handleExtract}
                      disabled={!text.trim() || loading}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all duration-200 hover:from-orange-600 hover:to-amber-600"
                    >
                      {loading ? "⏳ Analyse..." : "🔍 Analyser"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Client */}
                  <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-3 space-y-2">
                    <p className="text-orange-400/80 text-[11px] font-bold uppercase tracking-wider">👤 Client</p>
                    {([
                      { label: "Nom", value: result.clientName },
                      { label: "Téléphone", value: result.clientPhone },
                      { label: "Email", value: result.clientEmail },
                      { label: "Type", value: result.clientType },
                    ] as const).map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-gray-500">{label}</span>
                        <span className={value ? "text-gray-200" : "text-gray-600 italic"}>{value ?? "—"}</span>
                      </div>
                    ))}
                  </div>

                  {/* Repairs */}
                  {result.repairs.map((r, i) => (
                    <div key={i} className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-3 space-y-2">
                      <p className="text-orange-400/80 text-[11px] font-bold uppercase tracking-wider">
                        🔧 Appareil{result.repairs.length > 1 ? ` #${i + 1}` : ""}
                      </p>
                      {([
                        { label: "Modèle", value: r.device },
                        { label: "Panne", value: r.issue },
                        { label: "Prix", value: r.estimatedPrice !== null ? `${r.estimatedPrice}€` : null },
                        { label: "IMEI", value: r.imei },
                        { label: "Code", value: r.code },
                        { label: "Note", value: r.description },
                      ] as Array<{ label: string; value: string | null }>).map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-xs gap-4">
                          <span className="text-gray-500 flex-shrink-0">{label}</span>
                          <span className={value ? "text-gray-200 text-right" : "text-gray-600 italic"}>{value ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Confirm */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirm}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl py-3 text-sm font-bold transition-all duration-200"
                    >
                      ✅ Remplir
                    </button>
                    <button
                      onClick={reset}
                      className="flex-1 bg-white/[0.07] border border-white/10 hover:bg-white/15 text-gray-300 rounded-xl py-3 text-sm font-semibold transition-all duration-200"
                    >
                      ✏️ Modifier
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
