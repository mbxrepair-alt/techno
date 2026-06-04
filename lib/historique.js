import { supabase } from "./supabase";

/**
 * Récupère le technicien connecté depuis sessionStorage
 */
export const getCurrentTechnician = () => {
  if (typeof window === "undefined") return null;
  
  const techPermissions = sessionStorage.getItem("technician_permissions");
  if (techPermissions) {
    return JSON.parse(techPermissions);
  }
  return null;
};

/**
 * Enregistre une action dans l'historique (table 'historique')
 */
export const addHistoriqueAction = async ({ repairId, action, description, oldValue, newValue }) => {
  try {
    const currentTech = getCurrentTechnician();
    const userName = currentTech?.name || "Technicien inconnu";
    
    const { data, error } = await supabase
      .from('historique')  // ← Utilise la table 'historique', pas 'repair_history'
      .insert([{
        entity_type: 'appareil',
        entity_id: String(repairId),
        action: action,
        description: description,
        old_value: oldValue,
        new_value: newValue,
        user_type: 'technicien',
        user_name: userName,
        created_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Erreur ajout historique:", error);
    return { success: false, error };
  }
};

/**
 * Récupère l'historique d'un appareil (table 'historique')
 */
export const getHistoriqueAppareil = async (repairId) => {
  try {
    const { data, error } = await supabase
      .from('historique')  // ← Utilise la table 'historique', pas 'repair_history'
      .select('*')
      .eq('entity_type', 'appareil')
      .eq('entity_id', String(repairId))
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur récupération historique:", error);
    return [];
  }
};