import { supabase } from "./supabase";

/**
 * Récupère le technicien connecté depuis localStorage
 */
export const getCurrentTechnician = () => {
  if (typeof window === "undefined") return null;

  const techPermissions = localStorage.getItem("technician_permissions");
  if (techPermissions) {
    return JSON.parse(techPermissions);
  }
  return null;
};

/**
 * Enregistre une action dans l'historique (table 'historique')
 */
export const addHistoriqueAction = async ({
  repairId,
  action,
  description,
  oldValue,
  newValue,
}) => {
  try {
    const currentTech = getCurrentTechnician();
    const userName = currentTech?.name || "Technicien inconnu";

    const res = await fetch("/api/historique", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: "appareil",
        entity_id: String(repairId),
        action,
        description,
        old_value: oldValue,
        new_value: newValue,
        user_type: "technicien",
        user_name: userName,
      }),
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return { success: true };
  } catch (error) {
    console.error("Erreur ajout historique:", error);
    return { success: false, error };
  }
};

/**
 * Enregistre la création d'un appareil (pour la page new)
 */
export const enregistrerCreationAppareil = async (
  repairId,
  clientName,
  device,
  issue,
  diagnosis
) => {
  try {
    // Récupérer le technicien connecté
    let userName = "Technicien inconnu";
    if (typeof window !== "undefined") {
      const techPermissions = localStorage.getItem("technician_permissions");
      if (techPermissions) {
        const tech = JSON.parse(techPermissions);
        if (tech && tech.name) {
          userName = tech.name;
        }
      }
    }

    // 1. Créer la réparation dans la table repairs
    const { data: repairData, error: repairError } = await supabase
      .from("repairs")
      .insert([
        {
          client_name: clientName,
          device: device,
          issue: issue,
          diagnosis: diagnosis,
          status: "📥 Réceptionné",
          technician: userName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (repairError) throw repairError;

    const newRepairId = repairData?.[0]?.id;

    // 2. Ajouter à l'historique
    const { error: histError } = await supabase.from("historique").insert([
      {
        entity_type: "appareil",
        entity_id: String(newRepairId || repairId),
        action: "creation",
        description: `📦 Création de la réparation pour ${clientName} - ${device}`,
        old_value: null,
        new_value: JSON.stringify({ clientName, device, issue, diagnosis }),
        user_type: "technicien",
        user_name: userName,
        created_at: new Date().toISOString(),
      },
    ]);

    if (histError) throw histError;

    return { success: true, repairId: newRepairId };
  } catch (error) {
    console.error("Erreur création historique:", error);
    return { success: false, error };
  }
};

/**
 * Récupère l'historique d'un appareil (table 'historique')
 */
export const getHistoriqueAppareil = async (repairId) => {
  try {
    const { data, error } = await supabase
      .from("historique")
      .select("*")
      .eq("entity_type", "appareil")
      .eq("entity_id", String(repairId))
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur récupération historique:", error);
    return [];
  }
};

/**
 * Récupère l'historique complet d'un appareil avec les détails
 */
export const getHistoriqueComplet = async (repairId) => {
  try {
    const { data, error } = await supabase
      .from("historique")
      .select("*")
      .eq("entity_type", "appareil")
      .eq("entity_id", String(repairId))
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur récupération historique complet:", error);
    return [];
  }
};

/**
 * Ajoute un commentaire dans l'historique
 */
export const ajouterCommentaire = async (repairId, commentaire) => {
  return addHistoriqueAction({
    repairId: repairId,
    action: "commentaire",
    description: commentaire,
    oldValue: null,
    newValue: null,
  });
};

/**
 * Enregistre un changement de statut
 */
export const enregistrerChangementStatut = async (repairId, ancienStatut, nouveauStatut) => {
  return addHistoriqueAction({
    repairId: repairId,
    action: "changement_statut",
    description: `🔄 Statut : "${ancienStatut}" → "${nouveauStatut}"`,
    oldValue: ancienStatut,
    newValue: nouveauStatut,
  });
};

/**
 * Enregistre un changement de technicien
 */
export const enregistrerChangementTechnicien = async (
  repairId,
  ancienTechnicien,
  nouveauTechnicien
) => {
  return addHistoriqueAction({
    repairId: repairId,
    action: "changement_technicien",
    description: `👨‍🔧 Technicien : "${ancienTechnicien || "Non assigné"}" → "${nouveauTechnicien}"`,
    oldValue: ancienTechnicien || "Non assigné",
    newValue: nouveauTechnicien,
  });
};

/**
 * Enregistre une modification de champ
 */
export const enregistrerModification = async (repairId, champ, ancienneValeur, nouvelleValeur) => {
  return addHistoriqueAction({
    repairId: repairId,
    action: "modification",
    description: `✏️ ${champ} modifié : "${ancienneValeur || "vide"}" → "${nouvelleValeur || "vide"}"`,
    oldValue: ancienneValeur,
    newValue: nouvelleValeur,
  });
};
