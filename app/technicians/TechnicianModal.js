"use client";

import { useState, useEffect } from "react";

export default function TechnicianModal({ isOpen, onClose, onSave, technician }) {
  const [formData, setFormData] = useState({
    name: "",
    access_code: "",
    is_active: true,
    can_access_repairs: false,
    can_access_clients: false,
    can_access_factures: false,
    can_access_paiements: false,
    can_access_statistiques: false,
    can_access_settings: false,
    is_gerant: false
  });

  useEffect(() => {
    if (technician) {
      setFormData({
        name: technician.name || "",
        access_code: technician.access_code || "",
        is_active: technician.is_active ?? true,
        can_access_repairs: technician.can_access_repairs || false,
        can_access_clients: technician.can_access_clients || false,
        can_access_factures: technician.can_access_factures || false,
        can_access_paiements: technician.can_access_paiements || false,
        can_access_statistiques: technician.can_access_statistiques || false,
        can_access_settings: technician.can_access_settings || false,
        is_gerant: technician.is_gerant || false
      });
    } else {
      setFormData({
        name: "",
        access_code: "",
        is_active: true,
        can_access_repairs: false,
        can_access_clients: false,
        can_access_factures: false,
        can_access_paiements: false,
        can_access_statistiques: false,
        can_access_settings: false,
        is_gerant: false
      });
    }
  }, [technician]);

  // Générer un code aléatoire à 4 chiffres
  const generateRandomCode = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({ ...formData, access_code: randomCode });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Le nom est obligatoire");
      return;
    }
    if (!formData.access_code || formData.access_code.length !== 4) {
      alert("Un code à 4 chiffres est requis");
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {technician ? "✏️ Modifier" : "➕ Ajouter un technicien"}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Jean Dupont"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code d'accès (4 chiffres) *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.access_code}
                  onChange={(e) => setFormData({ ...formData, access_code: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                  placeholder="1234"
                  maxLength="4"
                  required
                />
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  title="Générer un code aléatoire"
                >
                  🎲
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔐 Permissions
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.can_access_repairs} 
                    onChange={(e) => setFormData({...formData, can_access_repairs: e.target.checked})} 
                  />
                  <span>🔧 Accès aux réparations</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.can_access_clients} 
                    onChange={(e) => setFormData({...formData, can_access_clients: e.target.checked})} 
                  />
                  <span>👥 Accès aux clients</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.can_access_factures} 
                    onChange={(e) => setFormData({...formData, can_access_factures: e.target.checked})} 
                  />
                  <span>📄 Accès aux factures</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.can_access_paiements} 
                    onChange={(e) => setFormData({...formData, can_access_paiements: e.target.checked})} 
                  />
                  <span>💳 Accès aux paiements</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.can_access_statistiques} 
                    onChange={(e) => setFormData({...formData, can_access_statistiques: e.target.checked})} 
                  />
                  <span>📊 Accès aux statistiques</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.can_access_settings} 
                    onChange={(e) => setFormData({...formData, can_access_settings: e.target.checked})} 
                  />
                  <span>⚙️ Accès aux paramètres</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.is_gerant} 
                  onChange={(e) => setFormData({...formData, is_gerant: e.target.checked})} 
                />
                <span className="font-medium">⭐ Gérant (accès total)</span>
              </label>
              <p className="text-xs text-gray-400 ml-6">Si coché, ce technicien aura accès à TOUT</p>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Actif</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                {technician ? "Mettre à jour" : "Ajouter"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}