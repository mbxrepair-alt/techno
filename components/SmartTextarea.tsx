"use client";

import { useState, useEffect, useRef } from "react";
import { generateDiagnostic, generateRepairSummary, suggestIssues } from "../lib/ai";
import { Mic, MicOff, Loader2 } from "lucide-react";

type TextareaType = "diagnostic" | "work" | "invoice" | "chat";
type ChangeEvent = React.ChangeEvent<HTMLTextAreaElement> | { target: { value: string } };

interface RepairData {
  device?: string;
  issue?: string;
  symptoms?: string;
  diagnosis?: string;
  partsUsed?: string;
  client?: unknown;
}

interface SmartTextareaProps {
  value: string;
  onChange: (e: ChangeEvent) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  type?: TextareaType;
  repairData?: RepairData | null;
  onAIGenerated?: ((text: string) => void) | null;
  disabled?: boolean;
}

const DEFAULTS: Record<TextareaType, string[]> = {
  diagnostic: [
    "🔬 Écran fissuré - remplacement nécessaire",
    "🔬 Circuit d'affichage défectueux",
    "🔬 Batterie ne tient pas la charge",
    "🔬 Port de charge défectueux",
    "🔬 Bouton power HS",
    "🔬 Problème de son / haut-parleur",
    "🔬 Micro défectueux",
    "🔬 Capteur de proximité défaillant",
    "🔬 Wi-Fi / Bluetooth instable",
    "🔬 Carte mère défectueuse",
    "🔬 Circuit modem défectueux",
    "🔬 Nappe tactile hors service",
    "🔬 Caméra défectueuse",
  ],
  work: [
    "✅ Remplacement écran complet",
    "✅ Remplacement circuit d'affichage",
    "✅ Changement batterie neuve",
    "✅ Nettoyage port de charge",
    "✅ Flash firmware",
    "✅ Remplacement haut-parleur",
    "✅ Réparation carte mère",
    "✅ Remplacement circuit modem",
    "✅ Test complet après réparation",
  ],
  invoice: [
    "🧾 Main d'œuvre : 49€",
    "🧾 Pièces détachées : à définir",
    "🧾 Forfait diagnostic : 0€",
    "🧾 Garantie 3 mois",
  ],
  chat: [],
};

export default function SmartTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
  type = "diagnostic",
  repairData = null,
  onAIGenerated = null,
  disabled = false,
}: SmartTextareaProps) {
  const [show, setShow] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [newSugg, setNewSugg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const defaultList = DEFAULTS[type] ?? DEFAULTS.diagnostic;

  useEffect(() => {
    const saved = localStorage.getItem(`sugg_${type}`);
    if (saved) setCustom(JSON.parse(saved));
  }, [type]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const save = (list: string[]): void => {
    setCustom(list);
    localStorage.setItem(`sugg_${type}`, JSON.stringify(list));
  };

  const addSuggestion = (): void => {
    if (!newSugg.trim()) return;
    save([newSugg.trim(), ...custom]);
    setNewSugg("");
    setShowAdd(false);
  };

  const deleteSuggestion = (s: string): void => save(custom.filter((item) => item !== s));

  const updateFilter = (text: string): void => {
    if (!text) { setShow(false); return; }
    const lastWord = text.split(/[\s\n]/).at(-1)?.toLowerCase() ?? "";
    if (lastWord.length < 2) { setShow(false); return; }
    const filtered = [...custom, ...defaultList].filter((s) => s.toLowerCase().includes(lastWord));
    setSuggestions(filtered.slice(0, 5));
    setShow(filtered.length > 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    onChange(e);
    updateFilter(e.target.value);
  };

  const selectSuggestion = (s: string): void => {
    const textarea = ref.current;
    if (!textarea) return;
    const text = textarea.value;
    const pos = textarea.selectionStart;
    const before = text.substring(0, pos);
    const after = text.substring(pos);
    const lastSpace = before.lastIndexOf(" ") + 1;
    const newText = before.substring(0, lastSpace) + s + " " + after;
    onChange({ target: { value: newText } });
    setShow(false);
    textarea.focus();
  };

  const toggleVoice = (): void => {
    if (disabled) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par ce navigateur. Utilisez Chrome ou Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = "";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interim = result[0].transcript;
        }
      }
      setTranscript(interim);
      const current = value || "";
      const base = current.trimEnd();
      onChange({ target: { value: base + (base ? " " : "") + finalText + interim } });
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript("");
      if (finalText) {
        const current = value || "";
        const base = current.trimEnd();
        onChange({ target: { value: base + (base ? " " : "") + finalText.trim() } });
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") console.error("Speech error:", e.error);
      setIsListening(false);
      setTranscript("");
    };

    recognition.start();
  };

  const generateAI = async (): Promise<void> => {
    if (!repairData?.device && type !== "chat") {
      alert("Veuillez d'abord renseigner l'appareil dans les champs ci-dessus");
      return;
    }
    setIsGenerating(true);
    let generatedText = "";
    try {
      switch (type) {
        case "diagnostic":
          generatedText = await generateDiagnostic(
            repairData?.device ?? "Appareil",
            repairData?.issue ?? "Panne inconnue",
            repairData?.symptoms ?? ""
          );
          break;
        case "work":
          generatedText = await generateRepairSummary(
            repairData?.device ?? "Appareil",
            repairData?.issue ?? "",
            repairData?.diagnosis ?? "",
            repairData?.partsUsed ?? ""
          );
          break;
        case "invoice":
          generatedText = await import("../lib/ai").then((m) =>
            m.generateInvoice(
              repairData as Parameters<typeof m.generateInvoice>[0],
              repairData?.client as Parameters<typeof m.generateInvoice>[1],
              []
            )
          );
          break;
        default:
          generatedText = await generateDiagnostic("Appareil", "Panne à diagnostiquer", "");
      }
      if (generatedText && onChange) onChange({ target: { value: generatedText } });
      onAIGenerated?.(generatedText);
    } catch (error) {
      console.error("Erreur génération IA:", error);
      alert("❌ Erreur lors de la génération IA. Vérifiez votre connexion.");
    } finally {
      setIsGenerating(false);
    }
  };

  const loadAISuggestions = async (): Promise<void> => {
    setShowAISuggestions(true);
    setAISuggestions([]);
    try {
      const deviceType = repairData?.device?.split(" ")[0] ?? "smartphone";
      setAISuggestions(await suggestIssues(deviceType));
    } catch (error) {
      console.error("Erreur chargement suggestions IA:", error);
    }
  };

  const insertAISuggestion = (suggestion: string): void => {
    const currentValue = value || "";
    onChange({ target: { value: currentValue + (currentValue ? "\n" : "") + suggestion } });
    setShowAISuggestions(false);
    ref.current?.focus();
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-1 gap-2">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-blue-500 hover:text-blue-400"
          >
            + Suggestion
          </button>
          {custom.length > 0 && (
            <button
              type="button"
              onClick={() => setShowList(!showList)}
              className="text-xs text-orange-500 hover:text-orange-400"
            >
              Gérer ({custom.length})
            </button>
          )}
          <button
            type="button"
            onClick={loadAISuggestions}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            🤖 Suggestions
          </button>
        </div>

        {/* MICRO BUTTON */}
        <button
          type="button"
          onClick={toggleVoice}
          disabled={disabled}
          title={isListening ? "Arrêter la dictée" : "Dicter par micro"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${
            isListening
              ? "bg-red-500/20 border border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20"
          }`}
        >
          {isListening ? (
            <>
              <MicOff size={13} className="shrink-0" />
              <span className="flex items-center gap-1">
                Stop
                <span className="inline-flex gap-0.5 items-end h-3">
                  <span className="w-0.5 bg-red-400 rounded-full animate-bounce" style={{ height: "6px", animationDelay: "0ms" }} />
                  <span className="w-0.5 bg-red-400 rounded-full animate-bounce" style={{ height: "10px", animationDelay: "100ms" }} />
                  <span className="w-0.5 bg-red-400 rounded-full animate-bounce" style={{ height: "7px", animationDelay: "200ms" }} />
                  <span className="w-0.5 bg-red-400 rounded-full animate-bounce" style={{ height: "12px", animationDelay: "150ms" }} />
                </span>
              </span>
            </>
          ) : isGenerating ? (
            <>
              <Loader2 size={13} className="animate-spin shrink-0" />
              <span>IA...</span>
            </>
          ) : (
            <>
              <Mic size={13} className="shrink-0" />
              <span>Dicter</span>
            </>
          )}
        </button>
      </div>

      {/* TRANSCRIPT PREVIEW */}
      {isListening && transcript && (
        <div className="mb-2 px-3 py-2 bg-red-500/8 border border-red-500/20 rounded-xl text-xs text-red-300 italic">
          🎙️ {transcript}
        </div>
      )}

      {showList && custom.length > 0 && (
        <div className="mb-2 p-2 bg-white/5 border border-white/8 rounded-xl">
          <p className="text-[10px] text-gray-500 mb-2">Cliquez sur ✕ pour supprimer :</p>
          <div className="flex flex-wrap gap-2">
            {custom.map((s, idx) => (
              <div key={idx} className="bg-white/5 text-gray-300 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-white/8">
                {s.length > 25 ? s.substring(0, 25) + "..." : s}
                <button
                  onClick={() => { deleteSuggestion(s); if (custom.length === 1) setShowList(false); }}
                  className="text-red-400 hover:text-red-300 font-bold ml-1"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={newSugg}
            onChange={(e) => setNewSugg(e.target.value)}
            placeholder="Nouvelle suggestion..."
            className="flex-1 text-xs bg-black/30 border border-white/10 rounded-xl px-2 py-1.5 text-white outline-none focus:border-orange-500/40 placeholder-gray-600"
            onKeyDown={(e) => e.key === "Enter" && addSuggestion()}
          />
          <button onClick={addSuggestion} className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-xl hover:bg-green-500">OK</button>
          <button onClick={() => setShowAdd(false)} className="bg-white/5 text-gray-400 text-xs px-2 py-1.5 rounded-xl hover:bg-white/10">✕</button>
        </div>
      )}

      {showAISuggestions && (
        <div className="mb-2 p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-purple-400">🤖 Suggestions IA</p>
            <button onClick={() => setShowAISuggestions(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
          </div>
          {aiSuggestions.length === 0 ? (
            <div className="text-center py-3">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-purple-500 mx-auto"></div>
              <p className="text-xs text-gray-500 mt-1">Chargement...</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {aiSuggestions.map((sugg, idx) => (
                <button
                  key={idx}
                  onClick={() => insertAISuggestion(sugg)}
                  className="bg-purple-500/10 text-purple-300 text-xs px-2.5 py-1 rounded-full border border-purple-500/20 hover:bg-purple-500/20 transition"
                >
                  {sugg}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        className={className}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />

      {show && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
              className="px-3 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex justify-between items-center"
            >
              <span>{s}</span>
              {custom.includes(s) && <span className="text-orange-400 text-xs ml-2">⭐</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
