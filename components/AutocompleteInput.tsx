"use client";

import { useState, useEffect, useRef, useMemo } from "react";

interface AutocompleteInputProps {
  value?: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  label?: string;
  icon?: string;
  onSuggestionSelect?: (suggestion: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  maxSuggestions?: number;
  emptyMessage?: string;
}

export default function AutocompleteInput({
  value = "",
  onChange,
  suggestions = [],
  placeholder = "Rechercher...",
  label = "",
  icon = "🔎",
  onSuggestionSelect,
  disabled = false,
  required = false,
  error = "",
  maxSuggestions = 8,
  emptyMessage = "Aucun résultat",
}: AutocompleteInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue || inputValue.length < 1) return [];
    const query = inputValue.toLowerCase();
    const filtered = suggestions
      .filter(item => item?.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query);
        const bStarts = b.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.length - b.length;
      });
    return [...new Set(filtered)].slice(0, maxSuggestions);
  }, [inputValue, suggestions, maxSuggestions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setSelectedIndex(-1);
    setShowSuggestions(newValue.trim().length > 0);
  };

  const handleSelect = (suggestion: string): void => {
    setInputValue(suggestion);
    onChange(suggestion);
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showSuggestions) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => prev < filteredSuggestions.length - 1 ? prev + 1 : 0);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : filteredSuggestions.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          handleSelect(filteredSuggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const highlightMatch = (text: string): React.ReactNode => {
    if (!inputValue) return text;
    const regex = new RegExp(`(${inputValue})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === inputValue.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 text-black px-0.5 rounded">{part}</mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <span className="flex items-center gap-2">
            <span>{icon}</span>
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
          </span>
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (filteredSuggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          className={`w-full rounded-2xl border bg-white px-4 py-3 pr-10 text-sm shadow-sm transition-all duration-200 outline-none
            ${error ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"}
            ${disabled ? "bg-gray-100 cursor-not-allowed opacity-70" : "hover:border-gray-400"}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {showSuggestions && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95">
          <div className="max-h-72 overflow-y-auto">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  onMouseDown={() => handleSelect(suggestion)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition border-b last:border-b-0
                    ${selectedIndex === index ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"}`}
                >
                  <span>{highlightMatch(suggestion)}</span>
                  <span className="text-gray-300">↵</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-sm text-gray-500 text-center">{emptyMessage}</div>
            )}
          </div>
        </div>
      )}
      {isFocused && filteredSuggestions.length > 0 && (
        <div className="mt-2 text-xs text-gray-400 flex justify-between">
          <span>{filteredSuggestions.length} suggestion(s)</span>
          <span>↑ ↓ naviguer • Entrée sélectionner</span>
        </div>
      )}
    </div>
  );
}
