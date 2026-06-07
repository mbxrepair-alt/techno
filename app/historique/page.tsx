"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { getHistoriqueAppareil } from "../../lib/historique";

// Configuration des statuts
const STATUS_CONFIG = {
  "📤 Envoyé à l'atelier": { label: "📤 Envoyé à l'atelier", color: "bg-blue-100 text-blue-800", badge: "📤 Envoyé", order: 0, icon: "📤" },
  "📥 Réceptionné": { label: "📥 Réceptionné", color: "bg-yellow-100 text-yellow-800", badge: "📥 Réceptionné", order: 1, icon: "📥" },
  "🔬 Diagnostic": { label: "🔬 Diagnostic", color: "bg-blue-100 text-blue-800", badge: "🔬 Diagnostic", order: 2, icon: "🔬" },
  "✅ Validé client": { label: "✅ Validé client", color: "bg-green-100 text-green-800", badge: "✅ Validé client", order: 3, icon: "✅" },
  "⏳ Attente validation client": { label: "⏳ Attente validation", color: "bg-orange-100 text-orange-800", badge: "⏳ Attente validation", order: 4, icon: "⏳" },
  "🔐 Mot de passe incorrect": { label: "🔐 Mot de passe incorrect", color: "bg-red-100 text-red-800", badge: "🔐 Mot de passe incorrect", order: 5, icon: "🔐" },
  "📦 Attente pièce": { label: "📦 Attente pièce", color: "bg-purple-100 text-purple-800", badge: "📦 Attente pièce", order: 6, icon: "📦" },
  "🔧 En réparation": { label: "🔧 En réparation", color: "bg-cyan-100 text-cyan-800", badge: "🔧 En réparation", order: 7, icon: "🔧" },
  "❌ KO": { label: "❌ KO - Irréparable", color: "bg-red-100 text-red-800", badge: "❌ KO", order: 8, icon: "❌" },
  "🚫 Refus client": { label: "🚫 Refus client", color: "bg-pink-100 text-pink-800", badge: "🚫 Refus client", order: 9, icon: "🚫" },
  "✅ Terminé": { label: "✅ Terminé", color: "bg-green-100 text-green-800", badge: "✅ Terminé", order: 10, icon: "✅" },
  "📦 Rendu": { label: "📦 Rendu", color: "bg-gray-100 text-gray-800", badge: "📦 Rendu", order: 11, icon: "📦" }
};

const SORT_OPTIONS = [
  { value: "date_desc", label: "📅 Date récente", icon: "📅" },
  { value: "date_asc", label: "📅 Date ancienne", icon: "📅" },
  { value: "client_asc", label: "👤 Client A-Z", icon: "👤" },
  { value: "price_desc", label: "💰 Prix descendant", icon: "💰" },
  { value: "price_asc", label: "💰 Prix ascendant", icon: "💰" }
];

// Fonction de formatage avec DATE et HEURE
const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export default function HistoriquePage() {
  const router = useRouter();
  
  const [repairs, setRepairs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [appareilHistorique, setAppareilHistorique] = useState([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  // Map pour convertir email -> nom du technicien
  const [emailToNameMap, setEmailToNameMap] = useState({});
  // Map pour convertir user_name -> nom du technicien (pour remplacer mbxrepair par Julie)
  const [userNameToNameMap, setUserNameToNameMap] = useState({});

  // Charger la correspondance email -> nom technicien
  const loadTechnicians = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      const { data } = await supabase
        .from("technicians")
        .select("*")
        .eq("user_id", user.id);
      
      const emailMap = {};
      const nameMap = {};
      
      data?.forEach(tech => {
        // Map par email
        if (tech.user_email) {
          emailMap[tech.user_email] = tech.name;
        }
        // Map par nom d'utilisateur (pour remplacer mbxrepair)
        if (tech.name) {
          nameMap[tech.name.toLowerCase()] = tech.name;
        }
      });
      
      // Ajouter des correspondances manuelles courantes
      emailMap["mbxrepair@gmail.com"] = "Julie (Tech)";
      emailMap["mbxrepair"] = "Julie (Tech)";
      nameMap["mbxrepair"] = "Julie (Tech)";
      
      setEmailToNameMap(emailMap);
      setUserNameToNameMap(nameMap);
      
      console.log("Map email -> nom:", emailMap);
      console.log("Map user_name -> nom:", nameMap);
    } catch (error) {
      console.error("Erreur chargement techniciens:", error);
    }
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: repairsData, error: repairsError } = await supabase
        .from("repairs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (repairsError) throw repairsError;

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id);

      if (clientsError) throw clientsError;

      const clientsMap = {};
      clientsData.forEach(client => {
        clientsMap[client.id] = client;
      });

      const repairsWithClients = repairsData.map(repair => {
        const enriched = {
          ...repair,
          client: clientsMap[repair.client_id] || null,
          partsList: [],
          photos: repair.photos || [],
          statusHistory: [],
          priceHistory: []
        };
        
        if (repair.parts_used) {
          try {
            enriched.partsList = JSON.parse(repair.parts_used);
          } catch (e) {
            enriched.partsList = [];
          }
        }
        
        if (repair.status_history) {
          try {
            enriched.statusHistory = JSON.parse(repair.status_history);
          } catch (e) {
            enriched.statusHistory = [];
          }
        }

        if (repair.price_history) {
          try {
            enriched.priceHistory = JSON.parse(repair.price_history);
          } catch (e) {
            enriched.priceHistory = [];
          }
        }
        
        return enriched;
      });

      setRepairs(repairsWithClients);
      setClients(clientsData);

    } catch (err) {
      console.error("Erreur lors du chargement:", err);
      setError("Impossible de charger l'historique des réparations.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadHistory();
    loadTechnicians();
  }, [loadHistory]);

  const loadAppareilHistorique = async (repairId) => {
    const historique = await getHistoriqueAppareil(repairId);
    setAppareilHistorique(historique);
  };

  const filteredAndSortedRepairs = useMemo(() => {
    let filtered = [...repairs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(repair => 
        repair.client?.name?.toLowerCase().includes(term) ||
        repair.client?.phone?.includes(term) ||
        repair.device?.toLowerCase().includes(term) ||
        repair.issue?.toLowerCase().includes(term) ||
        repair.id?.toString().includes(term)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(repair => repair.status === filterStatus);
    }

    if (filterClient !== "all") {
      filtered = filtered.filter(repair => repair.client_id === parseInt(filterClient));
    }

    switch (sortBy) {
      case "date_desc":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "date_asc":
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "client_asc":
        filtered.sort((a, b) => (a.client?.name || "").localeCompare(b.client?.name || ""));
        break;
      case "price_desc":
        filtered.sort((a, b) => (b.final_price || 0) - (a.final_price || 0));
        break;
      case "price_asc":
        filtered.sort((a, b) => (a.final_price || 0) - (b.final_price || 0));
        break;
      default:
        break;
    }

    return filtered;
  }, [searchTerm, filterStatus, filterClient, sortBy, repairs]);

  const getStatusBadge = useCallback((status) => {
    const config = STATUS_CONFIG[status] || { color: "bg-gray-100 text-gray-800", badge: status || "❓ Inconnu" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.badge}
      </span>
    );
  }, []);

  const openDetails = useCallback(async (repair) => {
    setSelectedRepair(repair);
    await loadAppareilHistorique(repair.id);
    setShowDetails(true);
  }, []);

  const closeDetails = useCallback(() => {
    setShowDetails(false);
    setSelectedRepair(null);
    setAppareilHistorique([]);
    setShowFullHistory(false);
  }, []);

  // Fonction pour obtenir le nom affichable d'un utilisateur
  const getUserDisplayName = (entry) => {
    if (entry.user_type === 'client') {
      return '👤 Client';
    }
    
    // Technicien : chercher par user_email
    if (entry.user_email && emailToNameMap[entry.user_email]) {
      return `🔧 ${emailToNameMap[entry.user_email]}`;
    }
    
    // Technicien : chercher par user_name
    if (entry.user_name) {
      // Vérifier si user_name correspond à un technicien
      const lowerName = entry.user_name.toLowerCase();
      if (userNameToNameMap[lowerName]) {
        return `🔧 ${userNameToNameMap[lowerName]}`;
      }
      
      // Remplacer mbxrepair par Julie (Tech) manuellement
      if (lowerName === 'mbxrepair' || entry.user_name === 'mbxrepair@gmail.com') {
        return `🔧 Julie (Tech)`;
      }
    }
    
    // Dernier fallback
    return `🔧 ${entry.user_name || entry.user_email?.split('@')[0] || 'Technicien'}`;
  };

  // Composant d'affichage de l'historique complet avec DATE et HEURE
  const FullHistoryTimeline = ({ historique }) => {
    if (!historique || historique.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">📭</p>
          <p>Aucun historique enregistré pour cet appareil</p>
          <p className="text-xs mt-2">Les actions seront tracées automatiquement</p>
        </div>
      );
    }

    const getActionIcon = (action) => {
      const icons = {
        'creation': '📦',
        'modification': '✏️',
        'changement_statut': '🔄',
        'changement_technicien': '👨‍🔧',
        'commentaire': '💬'
      };
      return icons[action] || '📌';
    };

    const getActionColor = (action) => {
      const colors = {
        'creation': 'border-green-500 bg-green-50',
        'modification': 'border-blue-500 bg-blue-50',
        'changement_statut': 'border-purple-500 bg-purple-50',
        'changement_technicien': 'border-orange-500 bg-orange-50',
        'commentaire': 'border-gray-500 bg-gray-50'
      };
      return colors[action] || 'border-gray-300 bg-gray-50';
    };

    const getActionTitle = (action) => {
      const titles = {
        'creation': '📦 Saisie initiale',
        'modification': '✏️ Modification',
        'changement_statut': '🔄 Changement de statut',
        'changement_technicien': '👨‍🔧 Changement de technicien',
        'commentaire': '💬 Commentaire'
      };
      return titles[action] || action;
    };

    return (
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        {historique.map((entry, index) => (
          <div key={entry.id} className="relative mb-6 flex items-start group">
            <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white z-10 ${getActionColor(entry.action)}`}>
              <div className={`w-full h-full rounded-full ${getActionColor(entry.action)}`}></div>
            </div>
            
            <div className={`ml-10 flex-1 rounded-lg p-4 border-l-4 ${getActionColor(entry.action)} transition hover:shadow-md`}>
              <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getActionIcon(entry.action)}</span>
                  <span className="font-bold text-gray-800">{getActionTitle(entry.action)}</span>
                </div>
                <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                  ⏱️ {formatDateTime(entry.created_at)}
                </div>
              </div>
              
              <p className="text-gray-700 text-sm mb-2">{entry.description}</p>
              
              {entry.old_value && entry.new_value && (
                <div className="bg-white/70 rounded p-2 text-xs mt-2">
                  <span className="text-gray-500">🔄 Modification :</span>{' '}
                  <span className="text-red-500 line-through">{entry.old_value}</span>
                  {' → '}
                  <span className="text-green-600 font-medium">{entry.new_value}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">
                    👤 {getUserDisplayName(entry)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    entry.user_type === 'client' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {entry.user_type === 'client' ? 'Client' : 'Technicien'}
                  </span>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(entry.description)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                  title="Copier"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Résumé */}
        <div className="ml-10 mt-4 p-3 bg-gray-100 rounded-lg text-center text-sm text-gray-600">
          📊 Total : {historique.length} action(s) enregistrée(s)
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-semibold">❌ Erreur</p>
            <p className="text-sm">{error}</p>
            <button onClick={() => loadHistory()} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
              Réessayer
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Modal Photo */}
      {showPhotoModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Photo" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button onClick={() => setShowPhotoModal(false)} className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl hover:bg-black/70 transition">✕</button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📜 Historique des réparations</h1>
          <p className="text-gray-500 text-sm mt-1">Consultez toutes vos réparations et leur suivi complet</p>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="🔍 Rechercher par client, téléphone, appareil, ticket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 border rounded-lg"
            >
              <option value="all">Tous les statuts</option>
              {Object.keys(STATUS_CONFIG).map(status => (
                <option key={status} value={status}>{STATUS_CONFIG[status].badge}</option>
              ))}
            </select>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="p-2 border rounded-lg"
            >
              <option value="all">Tous les clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500">Trier :</span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-3 py-1 rounded-lg text-xs transition ${
                  sortBy === option.value ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-3 text-sm text-gray-500">
            {filteredAndSortedRepairs.length} réparation(s) trouvée(s)
          </div>
        </div>

        {/* Liste des réparations */}
        <div className="space-y-3">
          {filteredAndSortedRepairs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
              Aucune réparation trouvée
            </div>
          ) : (
            filteredAndSortedRepairs.map((repair) => (
              <div
                key={repair.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition cursor-pointer"
                onClick={() => openDetails(repair)}
              >
                <div className="p-4">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">Ticket #{repair.id}</span>
                        {getStatusBadge(repair.status)}
                      </div>
                      <h3 className="font-semibold text-gray-800 mt-1">{repair.client?.name || "Client inconnu"}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm">
                        <span className="text-gray-600">📱 {repair.device || "-"}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">🔧 {repair.issue || "-"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{repair.final_price ? `${repair.final_price}€` : "-"}</div>
                      <div className="text-xs text-gray-400">{formatDateTime(repair.created_at)}</div>
                    </div>
                  </div>

                  {/* Photos */}
                  {repair.photos && repair.photos.length > 0 && (
                    <div className="flex gap-1 mt-3">
                      {repair.photos.slice(0, 3).map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          className="w-8 h-8 rounded object-cover cursor-pointer"
                          alt={`Photo ${idx + 1}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo); setShowPhotoModal(true); }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Détails */}
      {showDetails && selectedRepair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => closeDetails()}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* En-tête */}
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">📋 Détail de la réparation #{selectedRepair.id}</h2>
                <p className="text-xs text-gray-400">Ticket créé le {formatDateTime(selectedRepair.created_at)}</p>
              </div>
              <button onClick={closeDetails} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Client */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-3">👤 Informations client</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-gray-500">Nom:</span> {selectedRepair.client?.name || "-"}</div>
                  <div><span className="text-gray-500">Téléphone:</span> {selectedRepair.client?.phone || "-"}</div>
                  <div><span className="text-gray-500">Email:</span> {selectedRepair.client?.email || "-"}</div>
                  <div><span className="text-gray-500">Code client:</span> <span className="font-mono font-bold">{selectedRepair.client?.client_code || "-"}</span></div>
                </div>
              </div>

              {/* Bouton Historique */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowFullHistory(!showFullHistory)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
                >
                  <span>📜</span>
                  <span>{showFullHistory ? "Masquer" : "Afficher"} l'historique complet</span>
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">{appareilHistorique.length}</span>
                </button>
                <div className="text-xs text-gray-400">⏱️ Toutes les actions avec date et heure</div>
              </div>

              {/* Timeline Historique Complet */}
              {showFullHistory && (
                <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                    <span className="text-2xl">📜</span>
                    <span>Historique complet depuis la saisie</span>
                    <span className="text-xs text-gray-500 ml-2">⏱️ Toutes les actions tracées</span>
                  </h3>
                  <FullHistoryTimeline historique={appareilHistorique} />
                </div>
              )}

              {/* Chronologie réparation */}
              <div className="bg-white rounded-lg p-4 border">
                <h3 className="font-semibold mb-4 border-b pb-2">📅 Chronologie de la réparation</h3>
                <div className="space-y-3">
                  {/* Réception */}
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                    <div className="text-2xl">📥</div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold">📝 Saisie initiale</span>
                        <span className="text-xs text-gray-500">⏱️ {formatDateTime(selectedRepair.created_at)}</span>
                      </div>
                      <p className="text-sm mt-1">Appareil: {selectedRepair.device || "-"}</p>
                      <p className="text-sm">Panne: {selectedRepair.issue || "-"}</p>
                    </div>
                  </div>

                  {/* Diagnostic */}
                  {selectedRepair.diagnosis && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <div className="text-2xl">🔬</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold">Diagnostic</span>
                          <span className="text-xs text-gray-500">⏱️ {formatDateTime(selectedRepair.diagnostic_date || selectedRepair.updated_at)}</span>
                        </div>
                        <p className="text-sm mt-1">{selectedRepair.diagnosis}</p>
                      </div>
                    </div>
                  )}

                  {/* Fin réparation */}
                  {selectedRepair.end_time && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <div className="text-2xl">✅</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold">Réparation terminée</span>
                          <span className="text-xs text-gray-500">⏱️ {formatDateTime(selectedRepair.end_time)}</span>
                        </div>
                        <p className="text-sm mt-1">Prix final: <span className="font-bold">{selectedRepair.final_price || 0}€</span></p>
                      </div>
                    </div>
                  )}

                  {/* Rendu */}
                  {selectedRepair.return_date && (
                    <div className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg border-l-4 border-gray-500">
                      <div className="text-2xl">📦</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold">Rendu au client</span>
                          <span className="text-xs text-gray-500">⏱️ {formatDateTime(selectedRepair.return_date)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Appareil */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">📱 Appareil</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Modèle:</span> {selectedRepair.device || "-"}</div>
                  <div><span className="text-gray-500">Panne:</span> {selectedRepair.issue || "-"}</div>
                  {selectedRepair.imei && <div><span className="text-gray-500">IMEI:</span> {selectedRepair.imei}</div>}
                </div>
              </div>

              {/* Prix */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">💰 Prix</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Prix estimé:</span> {selectedRepair.estimated_price || 0}€</div>
                  <div><span className="text-gray-500">Prix final:</span> <span className="font-bold text-green-600">{selectedRepair.final_price || 0}€</span></div>
                </div>
              </div>

              {/* Photos */}
              {selectedRepair.photos && selectedRepair.photos.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">📸 Photos</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedRepair.photos.map((photo, idx) => (
                      <img key={idx} src={photo} className="w-full h-24 object-cover rounded cursor-pointer" onClick={() => { setSelectedPhoto(photo); setShowPhotoModal(true); }} alt="" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Boutons */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
              <button onClick={() => router.push(`/repairs/${selectedRepair.id}`)} className="flex-1 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                🔧 Voir et modifier
              </button>
              <button onClick={closeDetails} className="flex-1 bg-gray-200 p-2 rounded-lg hover:bg-gray-300">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
