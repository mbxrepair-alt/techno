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
  "📦 Rendu"
];

export default function StatusChanger({ repairId, currentStatus, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleChange = async (newStatus) => {
    if (newStatus === currentStatus) return;
    
    setLoading(true);
    try {
      // Enregistrer dans l'historique avec le nom du technicien connecté
      await addHistoriqueAction({
        repairId: repairId,
        action: "changement_statut",
        description: `Changement de statut : "${currentStatus}" → "${newStatus}"`,
        oldValue: currentStatus,
        newValue: newStatus
      });
      
      // Appeler la fonction de mise à jour du parent
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