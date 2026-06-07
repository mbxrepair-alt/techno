"use client";

import { useState } from "react";

interface Point {
  id: number;
  x: number;
  y: number;
}
interface Line {
  from: Point;
  to: Point;
}

interface PatternLockProps {
  onComplete: (pattern: number[]) => void;
  onClear: () => void;
}

const POINTS: Point[] = [
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

function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function getClosestPoint(x: number, y: number): Point | null {
  let closest: Point | null = null;
  let minDistance = 18;
  for (const point of POINTS) {
    const d = getDistance(x, y, point.x, point.y);
    if (d < minDistance) {
      minDistance = d;
      closest = point;
    }
  }
  return closest;
}

export default function PatternLock({ onComplete, onClear }: PatternLockProps) {
  const [pattern, setPattern] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handlePointerEvent = (
    e: React.MouseEvent | React.TouchEvent,
    type: "start" | "move"
  ): void => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = "clientX" in e ? e.clientX : e.touches[0]?.clientX;
    const clientY = "clientY" in e ? e.clientY : e.touches[0]?.clientY;
    if (!clientX || !clientY) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    if (type === "move") setMousePos({ x, y });
    const point = getClosestPoint(x, y);
    if (point && !pattern.includes(point.id)) {
      const newPattern = [...pattern, point.id];
      setPattern(newPattern);
      onComplete(newPattern);
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent): void => {
    setIsDrawing(true);
    handlePointerEvent(e, "start");
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent): void => {
    if (!isDrawing) return;
    handlePointerEvent(e, "move");
  };

  const handleEnd = (): void => {
    setIsDrawing(false);
    setMousePos({ x: 0, y: 0 });
  };

  const handleClear = (): void => {
    setPattern([]);
    onClear();
  };

  const getLinePoints = (): Line[] => {
    const lines: Line[] = [];
    for (let i = 0; i < pattern.length - 1; i++) {
      const from = POINTS.find((p) => p.id === pattern[i]);
      const to = POINTS.find((p) => p.id === pattern[i + 1]);
      if (from && to) lines.push({ from, to });
    }
    return lines;
  };

  const lastPoint = POINTS.find((p) => p.id === pattern[pattern.length - 1]);

  return (
    <div className="w-full max-w-[200px] mx-auto">
      <div
        className="relative aspect-square bg-gray-50 rounded-xl border border-gray-200 touch-none select-none p-3"
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
          {isDrawing && lastPoint && (
            <line
              x1={`${lastPoint.x}%`}
              y1={`${lastPoint.y}%`}
              x2={`${mousePos.x}%`}
              y2={`${mousePos.y}%`}
              stroke="#f97316"
              strokeWidth="3"
              strokeDasharray="4"
              strokeLinecap="round"
            />
          )}
        </svg>
        {POINTS.map((point) => (
          <div
            key={point.id}
            className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full transition-all duration-100 cursor-pointer
              ${pattern.includes(point.id) ? "bg-orange-500 shadow-md scale-110 ring-2 ring-orange-200" : "bg-white border-2 border-gray-300 hover:border-orange-400"}`}
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
