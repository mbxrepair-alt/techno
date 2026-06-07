"use client";

interface Point { id: number; x: number; y: number; }
interface Line { from: Point; to: Point; }

interface PatternLockViewerProps {
  pattern: string;
}

const POINTS: Point[] = [
  { id: 1, x: 8, y: 8 }, { id: 2, x: 50, y: 8 }, { id: 3, x: 92, y: 8 },
  { id: 4, x: 8, y: 50 }, { id: 5, x: 50, y: 50 }, { id: 6, x: 92, y: 50 },
  { id: 7, x: 8, y: 92 }, { id: 8, x: 50, y: 92 }, { id: 9, x: 92, y: 92 },
];

export default function PatternLockViewer({ pattern }: PatternLockViewerProps) {
  if (!pattern) return null;

  const pointsIds = pattern.split("-").map(Number);

  const getLinePoints = (): Line[] => {
    const lines: Line[] = [];
    for (let i = 0; i < pointsIds.length - 1; i++) {
      const from = POINTS.find(p => p.id === pointsIds[i]);
      const to = POINTS.find(p => p.id === pointsIds[i + 1]);
      if (from && to) lines.push({ from, to });
    }
    return lines;
  };

  const firstPointId = pointsIds.length > 0 ? pointsIds[0] : null;

  return (
    <div className="w-[160px] h-[160px] relative bg-gray-800 rounded-xl border border-gray-700 p-2">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {getLinePoints().map((line, idx) => (
          <line key={idx} x1={`${line.from.x}%`} y1={`${line.from.y}%`} x2={`${line.to.x}%`} y2={`${line.to.y}%`} stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
        ))}
      </svg>
      {POINTS.map(point => {
        const isSelected = pointsIds.includes(point.id);
        const isStartPoint = point.id === firstPointId;
        const position = pointsIds.indexOf(point.id) + 1;
        return (
          <div
            key={point.id}
            className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full flex items-center justify-center text-[10px] font-bold
              ${isSelected ? isStartPoint ? 'bg-green-500 shadow-md ring-2 ring-green-300 text-white' : 'bg-orange-500 shadow-md ring-2 ring-orange-300 text-white' : 'bg-gray-700 border border-gray-600 text-gray-500'}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {isSelected ? position : point.id}
          </div>
        );
      })}
    </div>
  );
}
