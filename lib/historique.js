import { supabase, getCurrentUser } from './supabase';

// Ajouter une entrée dans l'historique
export async function addHistorique({ entityType, entityId, action, description, oldValue = null, newValue = null }) {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const { data: userData } = await supabase.auth.getUser();
    
    const userType = userData?.user?.user_metadata?.role || 'technicien';
    const userName = userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Technicien';
    
    const entityIdStr = String(entityId);
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('historique')
      .insert([{
        entity_type: entityType,
        entity_id: entityIdStr,
        action: action,
        description: description,
        old_value: oldValue,
        new_value: newValue,
        user_id: user?.id,
        user_type: userType,
        user_name: userName,
        created_at: now
      }]);
    
    if (error) console.error('Erreur ajout historique:', error);
    return !error;
  } catch (error) {
    console.error('Erreur ajout historique:', error);
    return false;
  }
}

// Récupérer l'historique d'un appareil
export async function getHistoriqueAppareil(appareilId) {
  try {
    const appareilIdStr = String(appareilId);
    
    const { data, error } = await supabase
      .from('historique')
      .select('*')
      .eq('entity_type', 'appareil')
      .eq('entity_id', appareilIdStr)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    return [];
  }
}

// Enregistrer la création d'un appareil
export async function enregistrerCreationAppareil(repairId, clientName, device, issue) {
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'creation',
    description: `📦 Saisie initiale : Appareil déposé par ${clientName}`,
    newValue: `📱 Appareil: ${device} | 🔧 Panne: ${issue}`
  });
}

// Enregistrer un changement de statut
export async function enregistrerChangementStatut(repairId, ancienStatut, nouveauStatut, raison = null) {
  const description = raison 
    ? `🔄 Changement de statut : "${ancienStatut}" → "${nouveauStatut}" (Motif: ${raison})`
    : `🔄 Changement de statut : "${ancienStatut}" → "${nouveauStatut}"`;
  
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'changement_statut',
    description: description,
    oldValue: ancienStatut,
    newValue: nouveauStatut
  });
}

// Enregistrer un diagnostic
export async function enregistrerDiagnostic(repairId, diagnostic, risques = null) {
  const description = `🔬 Diagnostic effectué : ${diagnostic}` + (risques ? ` ⚠️ Risques: ${risques}` : '');
  
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'modification',
    description: description,
    newValue: diagnostic
  });
}

// Enregistrer une validation client
export async function enregistrerValidationClient(repairId, reponse, montant = null) {
  const description = reponse === 'accepte' 
    ? `✅ Client a accepté le devis de ${montant}€`
    : `❌ Client a refusé le devis`;
  
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'changement_statut',
    description: description,
    newValue: reponse === 'accepte' ? 'accepté' : 'refusé'
  });
}

// Enregistrer le début de réparation
export async function enregistrerDebutReparation(repairId, technicien) {
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'changement_statut',
    description: `🔧 Début de la réparation par ${technicien}`,
    newValue: 'En réparation'
  });
}

// Enregistrer la fin de réparation
export async function enregistrerFinReparation(repairId, prixFinal, descriptionReparation) {
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'modification',
    description: `✅ Réparation terminée : ${descriptionReparation} | Prix final: ${prixFinal}€`,
    newValue: `Terminé - ${prixFinal}€`
  });
}

// Enregistrer le rendu au client
export async function enregistrerRenduClient(repairId) {
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'changement_statut',
    description: `📦 Appareil rendu au client - Réparation terminée`,
    newValue: 'Rendu'
  });
}

// Enregistrer un commentaire
export async function enregistrerCommentaire(repairId, commentaire, userType = 'technicien') {
  const emoji = userType === 'client' ? '👤' : '🔧';
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'commentaire',
    description: `${emoji} ${commentaire}`
  });
}

// Enregistrer un changement de technicien
export async function enregistrerChangementTechnicien(repairId, ancienTechnicien, nouveauTechnicien) {
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'changement_technicien',
    description: `👨‍🔧 Changement de technicien : "${ancienTechnicien || 'Non assigné'}" → "${nouveauTechnicien}"`,
    oldValue: ancienTechnicien || 'Non assigné',
    newValue: nouveauTechnicien
  });
}

// Enregistrer l'ajout de pièces
export async function enregistrerAjoutPieces(repairId, pieces, total) {
  const piecesList = pieces.map(p => `${p.name} x${p.quantity}`).join(', ');
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'modification',
    description: `🔩 Pièces ajoutées : ${piecesList} | Total: ${total}€`,
    newValue: `${total}€ de pièces`
  });
}

// Enregistrer une modification de prix
export async function enregistrerModificationPrix(repairId, ancienPrix, nouveauPrix) {
  return await addHistorique({
    entityType: 'appareil',
    entityId: repairId,
    action: 'modification',
    description: `💰 Modification du prix : ${ancienPrix}€ → ${nouveauPrix}€`,
    oldValue: `${ancienPrix}€`,
    newValue: `${nouveauPrix}€`
  });
}