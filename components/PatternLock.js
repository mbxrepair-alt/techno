// components/PatternLock.js
"use client";

import { useState } from "react";

export default function PatternLock({ onComplete, onClear }) {
  const [pattern, setPattern] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Points avec ENCORE PLUS D'ESPACEMENT (bords à 5% et 95%)
  const points = [
    { id: 1, x: 8, y: 8 },
    { id: 2, x: 50, y: 8 },
    { id: 3, x: 92, y: 8 },
    { id: 4, x: 8, y: 50 },
    { id: 5, x: 50, y: 50 },
    { id: 6, x: 92, y: 50 },
    { id: 7, x: 8, y: 92 },
    { id: 8, x: 50, y: 92 },
    { id: 9, x: 92, y: 92 },
  ];

  const getDistance = (x1, y1, x2, y2) => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getClosestPoint = (x, y) => {
    let closest = null;
    let minDistance = 18;
    for (const point of points) {
      const distance = getDistance(x, y, point.x, point.y);
      if (distance < minDistance) {
        minDistance = distance;
        closest = point;
      }
    }
    return closest;
  };

  const handleStart = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    if (clientX && clientY) {
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      const point = getClosestPoint(x, y);
      if (point && !pattern.includes(point.id)) {
        const newPattern = [...pattern, point.id];
        setPattern(newPattern);
        onComplete(newPattern);
      }
    }
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    if (clientX && clientY) {
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      setMousePos({ x, y });
      const point = getClosestPoint(x, y);
      if (point && !pattern.includes(point.id)) {
        const newPattern = [...pattern, point.id];
        setPattern(newPattern);
        onComplete(newPattern);
      }
    }
  };

  const handleEnd = () => {
    setIsDrawing(false);
    setMousePos({ x: 0, y: 0 });
  };

  const handleClear = () => {
    setPattern([]);
    onClear();
  };

  const getLinePoints = () => {
    const lines = [];
    for (let i = 0; i < pattern.length - 1; i++) {
      const from = points.find(p => p.id === pattern[i]);
      const to = points.find(p => p.id === pattern[i + 1]);
      if (from && to) {
        lines.push({ from, to });
      }
    }
    return lines;
  };

  return (
    <div className="w-full max-w-[200px] mx-auto">
      <div className="relative aspect-square bg-gray-50 rounded-xl border border-gray-200 touch-none select-none p-3"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {getLinePoints().map((line, idx) => (
            <line
              key={idx}
              x1={`${line.from.x}%`}
              y1={`${line.from.y}%`}
              x2={`${line.to.x}%`}
              y2={`${line.to.y}%`}
              stroke="#f97316"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
          {isDrawing && pattern.length > 0 && (
            <line
              x1={`${points.find(p => p.id === pattern[pattern.length - 1])?.x}%`}
              y1={`${points.find(p => p.id === pattern[pattern.length - 1])?.y}%`}
              x2={`${mousePos.x}%`}
              y2={`${mousePos.y}%`}
              stroke="#f97316"
              strokeWidth="3"
              strokeDasharray="4"
              strokeLinecap="round"
            />
          )}
        </svg>
        
        {points.map(point => (
          <div
            key={point.id}
            className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full transition-all duration-100 cursor-pointer
              ${pattern.includes(point.id) 
                ? 'bg-orange-500 shadow-md scale-110 ring-2 ring-orange-200' 
                : 'bg-white border-2 border-gray-300 hover:border-orange-400'
              }`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          />
        ))}
      </div>
      
      <div className="flex justify-between items-center mt-2 px-1">
        <button
          type="button"
          onClick={handleClear}
          className="text-[10px] text-gray-400 hover:text-orange-500 transition"
        >
          Effacer
        </button>
        <span className="text-[10px] text-gray-400">
          {pattern.length === 0 ? "Dessinez" : `${pattern.length} pts`}
        </span>
      </div>
      
      <input type="hidden" name="unlock_pattern" value={pattern.join("-")} />
    </div>
  );
}