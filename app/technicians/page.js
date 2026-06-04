"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import TechnicianModal from "./TechnicianModal";
import { addLog } from "../../lib/logs";

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [currentTech, setCurrentTech] = useState(null);

  useEffect(() => {
    console.log("=== PAGE TECHNICIENS CHARGÉE ===");
    
    const storedCompanyId = sessionStorage.getItem("company_id");
    const storedTech = sessionStorage.getItem("technician_permissions");
    
    console.log("storedCompanyId:", storedCompanyId);
    console.log("storedTech:", storedTech);
    
    if (storedTech) {
      setCurrentTech(JSON.parse(storedTech));
    }
    
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
      fetchTechnicians(storedCompanyId);
    } else {
      console.error("Pas de company_id dans sessionStorage");
      setError("Session expirée, veuillez vous reconnecter");
      setLoading(false);
    }
  }, []);

  const fetchTechnicians = async (cid) => {
    try {
      setLoading(true);
      console.log("Fetch techniciens pour company_id:", cid);
      
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .eq("company_id", cid)
        .order("name");

      if (error) {
        console.error("Erreur Supabase:", error);
        throw error;
      }
      
      console.log("Techniciens trouvés:", data);
      setTechnicians(data || []);
    } catch (err) {
      console.error("Erreur fetch:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (tech) => {
    try {
      const dataToSave = {
        name: tech.name,
        access_code: tech.access_code,
        is_active: tech.is_active,
        is_gerant: tech.is_gerant || false,
        can_access_repairs: tech.can_access_repairs || false,
        can_access_clients: tech.can_access_clients || false,
        can_access_factures: tech.can_access_factures || false,
        can_access_paiements: tech.can_access_paiements || false,
        can_access_statistiques: tech.can_access_statistiques || false,
        can_access_settings: tech.can_access_settings || false,
        company_id: companyId
      };

      if (editingTech) {
        const { error } = await supabase
          .from("technicians")
          .update(dataToSave)
          .eq("id", editingTech.id);
        if (error) throw error;
        
        await addLog({
          action: "update_technician",
          technicienId: currentTech?.id,
          technicienName: currentTech?.name,
          companyId: companyId,
          details: { target_technician: tech.name, action_type: "updated" }
        });
      } else {
        const { error } = await supabase
          .from("technicians")
          .insert([dataToSave]);
        if (error) throw error;
        
        await addLog({
          action: "create_technician",
          technicienId: currentTech?.id,
          technicienName: currentTech?.name,
          companyId: companyId,
          details: { new_technician: tech.name, new_code: tech.access_code }
        });
      }
      
      fetchTechnicians(companyId);
      setModalOpen(false);
      setEditingTech(null);
    } catch (err) {
      alert("Erreur: " + err.message);
    }
  };

  const handleDelete = async (tech) => {
    if (!confirm("Supprimer ce technicien ?")) return;
    
    try {
      await addLog({
        action: "delete_technician",
        technicienId: currentTech?.id,
        technicienName: currentTech?.name,
        companyId: companyId,
        details: { deleted_technician: tech.name }
      });
      
      const { error } = await supabase
        .from("technicians")
        .delete()
        .eq("id", tech.id);
      if (error) throw error;
      fetchTechnicians(companyId);
    } catch (err) {
      alert("Erreur: " + err.message);
    }
  };

  const handleToggleActive = async (tech) => {
    if (tech.is_gerant) {
      alert("Un gérant ne peut pas être désactivé");
      return;
    }
    
    try {
      const newStatus = !tech.is_active;
      
      await addLog({
        action: newStatus ? "activate_technician" : "deactivate_technician",
        technicienId: currentTech?.id,
        technicienName: currentTech?.name,
        companyId: companyId,
        details: { target_technician: tech.name, new_status: newStatus ? "active" : "inactive" }
      });
      
      const { error } = await supabase
        .from("technicians")
        .update({ is_active: newStatus })
        .eq("id", tech.id);
      if (error) throw error;
      fetchTechnicians(companyId);
    } catch (err) {
      alert("Erreur: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-500">Chargement des techniciens...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">👨‍🔧 Techniciens</h1>
          <p className="text-gray-500 mt-1">Gérez votre équipe technique</p>
        </div>
        <button
          onClick={() => {
            setEditingTech(null);
            setModalOpen(true);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <span className="text-xl">+</span> Ajouter un technicien
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
          ❌ {error}
        </div>
      )}

      {technicians.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400 border">
          Aucun technicien. Cliquez sur "Ajouter" pour commencer.
        </div>
      ) : (
        <div className="grid gap-4">
          {technicians.map((tech) => (
            <div key={tech.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-lg">
                      👤
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{tech.name}</h3>
                      <div className="text-sm text-gray-500 mt-1">
                        Code: <span className="font-mono font-bold">{tech.access_code}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 ml-13">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      tech.is_active 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {tech.is_active ? "Actif" : "Inactif"}
                    </span>
                    {tech.is_gerant && (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                        ⭐ Gérant
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!tech.is_gerant && (
                    <button
                      onClick={() => handleToggleActive(tech)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        tech.is_active
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {tech.is_active ? "Désactiver" : "Activer"}
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setEditingTech(tech);
                      setModalOpen(true);
                    }}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                  >
                    ✏️ Modifier
                  </button>
                  
                  <button
                    onClick={() => handleDelete(tech)}
                    className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TechnicianModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTech(null);
        }}
        onSave={handleSave}
        technician={editingTech}
      />
    </div>
  );
}
