"use client";

import { useState, useEffect, useRef } from "react";

export default function SmartTextarea({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  rows = 4, 
  type = "diagnostic" 
}) {
  const [show, setShow] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [custom, setCustom] = useState([]);
  const [newSugg, setNewSugg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(false);
  const ref = useRef(null);

  const defaults = {
    diagnostic: [
      "🔬 Écran fissuré - remplacement nécessaire",
      "🔬 Batterie ne tient pas la charge",
      "🔬 Port de charge défectueux",
      "🔬 Bouton power HS",
    ],
    work: [
      "✅ Remplacement écran complet",
      "✅ Changement batterie neuve",
      "✅ Nettoyage port de charge",
      "✅ Flash firmware",
    ]
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

  return (
    <div className="relative">
      <div className="flex justify-end gap-2 mb-1">
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
      </div>

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

      {showAdd && (
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={newSugg}
            onChange={(e) => setNewSugg(e.target.value)}
            placeholder="Nouvelle suggestion..."
            className="flex-1 text-xs border rounded px-2 py-1"
            onKeyPress={(e) => e.key === 'Enter' && addSuggestion()}
          />
          <button onClick={addSuggestion} className="bg-green-500 text-white text-xs px-2 py-1 rounded">OK</button>
          <button onClick={() => setShowAdd(false)} className="bg-gray-300 text-xs px-2 py-1 rounded">X</button>
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
      />

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
                  <span className="text-blue-400 text-xs ml-2">⭐</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}