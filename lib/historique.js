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
 * Enregistre une action dans l'historique
 */
export const addHistoriqueAction = async ({ repairId, action, description, oldValue, newValue }) => {
  try {
    const currentTech = getCurrentTechnician();
    const userName = currentTech?.name || "Technicien inconnu";
    
    const { error } = await supabase
      .from('historique')
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
 * Enregistre la création d'un appareil (pour la page new)
 */
export const enregistrerCreationAppareil = async (repairId, clientName, device, issue, diagnosis) => {
  try {
    let userName = "Technicien inconnu";
    if (typeof window !== "undefined") {
      const techPermissions = sessionStorage.getItem("technician_permissions");
      if (techPermissions) {
        const tech = JSON.parse(techPermissions);
        if (tech && tech.name) {
          userName = tech.name;
        }
      }
    }
    
    const { error } = await supabase
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
    
    if (error) throw error;
    
    // Optionnel : créer aussi dans la table repairs
    const { error: repairError } = await supabase
      .from('repairs')
      .insert([{
        id: parseInt(repairId),
        client_name: clientName,
        device: device,
        issue: issue,
        diagnosis: diagnosis,
        status: '📥 Réceptionné',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
    
    if (repairError) console.error("Erreur création repair:", repairError);
    
    return { success: true };
  } catch (error) {
    console.error("Erreur création historique:", error);
    return { success: false, error };
  }
};

/**
 * Récupère l'historique d'un appareil
 */
export const getHistoriqueAppareil = async (repairId) => {
  try {
    const { data, error } = await supabase
      .from('historique')
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