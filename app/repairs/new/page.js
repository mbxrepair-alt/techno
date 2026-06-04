"use client";

import { useState } from "react";
import SmartTextarea from "../../../components/SmartTextarea";
import { supabase } from "../../../lib/supabase";

export default function NewRepairPage() {
  const [clientName, setClientName] = useState("");
  const [device, setDevice] = useState("");
  const [issue, setIssue] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Récupérer le technicien connecté
      let userName = "Technicien inconnu";
      const techPermissions = sessionStorage.getItem("technician_permissions");
      if (techPermissions) {
        const tech = JSON.parse(techPermissions);
        if (tech && tech.name) {
          userName = tech.name;
        }
      }
      
      // Créer la réparation
      const { data: repairData, error: repairError } = await supabase
        .from('repairs')
        .insert([{
          client_name: clientName,
          device: device,
          issue: issue,
          diagnosis: diagnosis,
          status: '📥 Réceptionné',
          technician: userName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (repairError) throw repairError;
      
      // Ajouter à l'historique
      const repairId = repairData?.[0]?.id;
      if (repairId) {
        await supabase
          .from('historique')
          .insert([{
            entity_type: 'appareil',
            entity_id: String(repairId),
            action: 'creation',
            description: `📦 Création de la réparation pour ${clientName} - ${device}`,
            old_value: null,
            new_value: JSON.stringify({ clientName, device, issue, diagnosis }),
            user_type: 'technicien',
            user_name: userName,
            created_at: new Date().toISOString()
          }]);
      }
      
      alert("✅ Réparation créée avec succès !");
      setClientName("");
      setDevice("");
      setIssue("");
      setDiagnosis("");
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">📝 Nouvelle réparation</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">👤 Nom du client *</label>
          <input 
            type="text"
            value={clientName} 
            onChange={(e) => setClientName(e.target.value)} 
            placeholder="Nom du client" 
            required 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📱 Appareil *</label>
          <input 
            type="text"
            value={device} 
            onChange={(e) => setDevice(e.target.value)} 
            placeholder="Ex: iPhone 15 Pro" 
            required 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">⚠️ Problème *</label>
          <input 
            type="text"
            value={issue} 
            onChange={(e) => setIssue(e.target.value)} 
            placeholder="Ex: Ne s'allume plus" 
            required 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">🔬 Diagnostic</label>
          <SmartTextarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="🔬 Décrivez votre diagnostic..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "⏳ Création..." : "✅ Créer la réparation"}
        </button>
      </form>
    </div>
  );
}
