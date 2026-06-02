// components/ReturnModal.js
"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ReturnModal({ repair, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const reasons = [
    "🔧 Panne récurrente",
    "🔋 Batterie ne tient pas",
    "📱 Écran défectueux",
    "🔊 Son / Haut-parleur",
    "📷 Appareil photo",
    "⚡ Problème de charge",
    "📶 Wi-Fi / Bluetooth",
    "🔒 Logiciel / Mise à jour",
    "💧 Problème d'oxydation",
    "❌ Autre problème"
  ];

  const handleSubmit = async () => {
    if (!reason) {
      alert("Veuillez sélectionner un motif");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("repairs")
      .update({
        return_reason: reason,
        return_description: description,
        return_status: "pending",
        return_date: new Date().toISOString(),
        status: "🔄 Retour SAV"
      })
      .eq("id", repair.id);

    if (error) {
      alert("Erreur: " + error.message);
    } else {
      alert("✅ Retour SAV enregistré - Ticket réouvert");
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">🔄 Retour SAV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500">Ticket #{repair.id}</p>
          <p className="font-medium">{repair.client?.name || repair.client_name}</p>
          <p className="text-sm text-gray-600">📱 {repair.device} - 🔧 {repair.issue}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif du retour *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Sélectionner un motif</option>
              {reasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Décrivez précisément le problème rencontré..."
            />
          </div>

          <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800">
            ⚠️ Le client a déjà récupéré son appareil. Un retour SAV va rouvrir le ticket.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition"
            >
              {loading ? "Traitement..." : "🔄 Valider le retour SAV"}
            </button>
            <button onClick={onClose} className="flex-1 bg-gray-100 py-3 rounded-xl hover:bg-gray-200 transition">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}