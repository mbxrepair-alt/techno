"use client";

import { useState, useEffect, useRef } from "react";
import { generateDiagnostic, generateRepairSummary, suggestIssues } from "../lib/ai";

export default function SmartTextarea({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  rows = 4, 
  type = "diagnostic",
  repairData = null,
  onAIGenerated = null
}) {
  const [show, setShow] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [custom, setCustom] = useState([]);
  const [newSugg, setNewSugg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState([]);
  const ref = useRef(null);

  const defaults = {
    diagnostic: [
      "🔬 Écran fissuré - remplacement nécessaire",
      "🔬 Batterie ne tient pas la charge",
      "🔬 Port de charge défectueux",
      "🔬 Bouton power HS",
      "🔬 Problème de son / haut-parleur",
      "🔬 Capteur de proximité défaillant",
      "🔬 Micro qui ne fonctionne pas",
      "🔬 Wi-Fi / Bluetooth instable",
    ],
    work: [
      "✅ Remplacement écran complet",
      "✅ Changement batterie neuve",
      "✅ Nettoyage port de charge",
      "✅ Flash firmware",
      "✅ Remplacement haut-parleur",
      "✅ Réparation carte mère",
      "✅ Test complet après réparation",
    ],
    invoice: [
      "🧾 Main d'œuvre : 49€",
      "🧾 Pièces détachées : à définir",
      "🧾 Forfait diagnostic : 0€",
      "🧾 Garantie 3 mois",
    ],
    chat: []
  };

  const defaultList = defaults[type] || defaults.diagnostic;

  useEffect(() => {
    const saved = localStorage.getItem(`sugg_${type}`);
    if (saved) setCustom(JSON.parse(saved));
  }, [type]);

  const save = (list) => {
    setCustom(list);
    localStorage.setItem(`sugg_${type}`, JSON.stringify(list));
  };

  const addSuggestion = () => {
    if (!newSugg.trim()) return;
    save([newSugg.trim(), ...custom]);
    setNewSugg("");
    setShowAdd(false);
  };

  const deleteSuggestion = (s) => {
    const newList = custom.filter(item => item !== s);
    save(newList);
  };

  const updateFilter = (text) => {
    if (!text) {
      setShow(false);
      return;
    }
    const words = text.split(/[\s\n]/);
    const lastWord = words[words.length - 1].toLowerCase();
    if (lastWord.length < 2) {
      setShow(false);
      return;
    }
    const all = [...custom, ...defaultList];
    const filtered = all.filter(s => s.toLowerCase().includes(lastWord));
    setSuggestions(filtered.slice(0, 5));
    setShow(filtered.length > 0);
  };

  const handleChange = (e) => {
    onChange(e);
    updateFilter(e.target.value);
  };

  const selectSuggestion = (s) => {
    const textarea = ref.current;
    const text = textarea.value;
    const pos = textarea.selectionStart;
    const before = text.substring(0, pos);
    const after = text.substring(pos);
    const lastSpace = before.lastIndexOf(' ') + 1;
    const newText = before.substring(0, lastSpace) + s + ' ' + after;
    onChange({ target: { value: newText } });
    setShow(false);
    textarea.focus();
  };

  // 🤖 GÉNÉRATION IA
  const generateAI = async () => {
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
            repairData?.device || "Appareil",
            repairData?.issue || "Panne inconnue",
            repairData?.symptoms || ""
          );
          break;
        case "work":
          generatedText = await generateRepairSummary(
            repairData?.device || "Appareil",
            repairData?.issue || "",
            repairData?.diagnosis || "",
            repairData?.partsUsed || ""
          );
          break;
        case "invoice":
          generatedText = await import("../lib/ai").then(module => 
            module.generateInvoice(repairData, repairData?.client, [])
          );
          break;
        default:
          generatedText = await generateDiagnostic("Appareil", "Panne à diagnostiquer", "");
      }

      if (generatedText && onChange) {
        onChange({ target: { value: generatedText } });
      }
      if (onAIGenerated) onAIGenerated(generatedText);
    } catch (error) {
      console.error("Erreur génération IA:", error);
      alert("❌ Erreur lors de la génération IA. Vérifiez votre connexion.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 🤖 SUGGESTIONS IA DE PANNES
  const loadAISuggestions = async () => {
    setShowAISuggestions(true);
    setAISuggestions([]);
    try {
      const deviceType = repairData?.device?.split(" ")[0] || "smartphone";
      const suggestions = await suggestIssues(deviceType);
      setAISuggestions(suggestions);
    } catch (error) {
      console.error("Erreur chargement suggestions IA:", error);
    }
  };

  const insertAISuggestion = (suggestion) => {
    const currentValue = value || "";
    const newValue = currentValue + (currentValue ? "\n" : "") + suggestion;
    onChange({ target: { value: newValue } });
    setShowAISuggestions(false);
    ref.current?.focus();
  };

  return (
    <div className="relative">
      {/* Boutons d'action */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            + Ajouter suggestion
          </button>
          {custom.length > 0 && (
            <button
              type="button"
              onClick={() => setShowList(!showList)}
              className="text-xs text-orange-500 hover:text-orange-700"
            >
              - Gérer ({custom.length})
            </button>
          )}
          <button
            type="button"
            onClick={loadAISuggestions}
            className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1"
          >
            🤖 Suggestions IA
          </button>
        </div>
        
        {/* Bouton IA principale */}
        <button
          type="button"
          onClick={generateAI}
          disabled={isGenerating}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 flex items-center gap-1"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              Génération...
            </>
          ) : (
            <>🤖 Générer avec IA</>
          )}
        </button>
      </div>

      {/* Gestion des suggestions personnalisées */}
      {showList && custom.length > 0 && (
        <div className="mb-2 p-2 bg-white border rounded-lg shadow-sm">
          <p className="text-[10px] text-gray-400 mb-2">Cliquez sur ✕ pour supprimer :</p>
          <div className="flex flex-wrap gap-2">
            {custom.map((s, idx) => (
              <div
                key={idx}
                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"
              >
                {s.length > 25 ? s.substring(0, 25) + "..." : s}
                <button
                  onClick={() => {
                    deleteSuggestion(s);
                    if (custom.length === 1) setShowList(false);
                  }}
                  className="text-red-500 hover:text-red-700 font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ajout nouvelle suggestion */}
      {showAdd && (
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={newSugg}
            onChange={(e) => setNewSugg(e.target.value)}
            placeholder="Nouvelle suggestion..."
            className="flex-1 text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addSuggestion()}
          />
          <button onClick={addSuggestion} className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600">OK</button>
          <button onClick={() => setShowAdd(false)} className="bg-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-400">X</button>
        </div>
      )}

      {/* Suggestions IA */}
      {showAISuggestions && (
        <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-purple-700">🤖 Suggestions IA</p>
            <button onClick={() => setShowAISuggestions(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
          {aiSuggestions.length === 0 ? (
            <div className="text-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mx-auto"></div>
              <p className="text-xs text-gray-400 mt-1">Chargement des suggestions...</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((sugg, idx) => (
                <button
                  key={idx}
                  onClick={() => insertAISuggestion(sugg)}
                  className="bg-white text-purple-700 text-xs px-2 py-1 rounded-full border border-purple-200 hover:bg-purple-100 transition"
                >
                  {sugg}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        className={className}
        placeholder={placeholder}
        rows={rows}
      />

      {/* Suggestions contextuelles */}
      {show && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => {
            const isCustom = custom.includes(s);
            return (
              <div
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s);
                }}
                className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b last:border-0 flex justify-between items-center"
              >
                <span>{s}</span>
                {isCustom && (
                  <span className="text-blue-400 text-xs ml-2">⭐ Personnalisé</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}