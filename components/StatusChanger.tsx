"use client";

import { useState } from "react";
import { addHistoriqueAction } from "../lib/historique";

const STATUS_LIST = [
  "📥 Réceptionné",
  "🔬 Diagnostic",
  "✅ Validé client",
  "⏳ Attente validation client",
  "🔐 Mot de passe incorrect",
  "📦 Attente pièce",
  "🔧 En réparation",
  "❌ KO",
  "🚫 Refus client",
  "✅ Terminé",
  "📦 Rendu",
];

interface StatusChangerProps {
  repairId: number | string;
  currentStatus: string;
  onStatusChange: (repairId: number | string, newStatus: string) => Promise<void> | void;
}

export default function StatusChanger({
  repairId,
  currentStatus,
  onStatusChange,
}: StatusChangerProps) {
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleChange = async (newStatus: string): Promise<void> => {
    if (newStatus === currentStatus) return;

    setLoading(true);
    try {
      await addHistoriqueAction({
        repairId,
        action: "changement_statut",
        description: `Changement de statut : "${currentStatus}" → "${newStatus}"`,
        oldValue: currentStatus,
        newValue: newStatus,
      });
      await onStatusChange(repairId, newStatus);
      setSelectedStatus(newStatus);
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={selectedStatus}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
    >
      {STATUS_LIST.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}
