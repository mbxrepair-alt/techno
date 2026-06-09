"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { getHistoriqueAppareil } from "../../lib/historique";

// Configuration des statuts
const STATUS_CONFIG = {
  "📤 Envoyé à l'atelier": {
    label: "📤 Envoyé à l'atelier",
    color: "bg-blue-500/15 text-blue-400",
    badge: "📤 Envoyé",
    order: 0,
    icon: "📤",
  },
  "📥 Réceptionné": {
    label: "📥 Réceptionné",
    color: "bg-amber-500/15 text-amber-400",
    badge: "📥 Réceptionné",
    order: 1,
    icon: "📥",
  },
  "🔬 Diagnostic": {
    label: "🔬 Diagnostic",
    color: "bg-blue-500/15 text-blue-400",
    badge: "🔬 Diagnostic",
    order: 2,
    icon: "🔬",
  },
  "✅ Validé client": {
    label: "✅ Validé client",
    color: "bg-emerald-500/15 text-emerald-400",
    badge: "✅ Validé client",
    order: 3,
    icon: "✅",
  },
  "⏳ Attente validation client": {
    label: "⏳ Attente validation",
    color: "bg-orange-500/15 text-orange-400",
    badge: "⏳ Attente validation",
    order: 4,
    icon: "⏳",
  },
  "🔐 Mot de passe incorrect": {
    label: "🔐 Mot de passe incorrect",
    color: "bg-red-500/15 text-red-400",
    badge: "🔐 Mot de passe incorrect",
    order: 5,
    icon: "🔐",
  },
  "📦 Attente pièce": {
    label: "📦 Attente pièce",
    color: "bg-purple-500/15 text-purple-400",
    badge: "📦 Attente pièce",
    order: 6,
    icon: "📦",
  },
  "🔧 En réparation": {
    label: "🔧 En réparation",
    color: "bg-cyan-500/15 text-cyan-400",
    badge: "🔧 En réparation",
    order: 7,
    icon: "🔧",
  },
  "❌ KO": {
    label: "❌ KO - Irréparable",
    color: "bg-red-500/15 text-red-400",
    badge: "❌ KO",
    order: 8,
    icon: "❌",
  },
  "🚫 Refus client": {
    label: "🚫 Refus client",
    color: "bg-pink-500/15 text-pink-400",
    badge: "🚫 Refus client",
    order: 9,
    icon: "🚫",
  },
  "✅ Terminé": {
    label: "✅ Terminé",
    color: "bg-green-100 text-green-800",
    badge: "✅ Terminé",
    order: 10,
    icon: "✅",
  },
  "📦 Rendu": {
    label: "📦 Rendu",
    color: "bg-gray-100 text-gray-800",
    badge: "📦 Rendu",
    order: 11,
    icon: "📦",
  },
};

const SORT_OPTIONS = [
  { value: "date_desc", label: "📅 Date récente", icon: "📅" },
  { value: "date_asc", label: "📅 Date ancienne", icon: "📅" },
  { value: "client_asc", label: "👤 Client A-Z", icon: "👤" },
  { value: "price_desc", label: "💰 Prix descendant", icon: "💰" },
  { value: "price_asc", label: "💰 Prix ascendant", icon: "💰" },
];

// Fonction de formatage avec DATE et HEURE
const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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

      const { data } = await supabase.from("technicians").select("*").eq("user_id", user.id);

      const emailMap = {};
      const nameMap = {};

      data?.forEach((tech) => {
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
      clientsData.forEach((client) => {
        clientsMap[client.id] = client;
      });

      const repairsWithClients = repairsData.map((repair) => {
        const enriched = {
          ...repair,
          client: clientsMap[repair.client_id] || null,
          partsList: [],
          photos: repair.photos || [],
          statusHistory: [],
          priceHistory: [],
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
      filtered = filtered.filter(
        (repair) =>
          repair.client?.name?.toLowerCase().includes(term) ||
          repair.client?.phone?.includes(term) ||
          repair.device?.toLowerCase().includes(term) ||
          repair.issue?.toLowerCase().includes(term) ||
          repair.id?.toString().includes(term)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((repair) => repair.status === filterStatus);
    }

    if (filterClient !== "all") {
      filtered = filtered.filter((repair) => repair.client_id === parseInt(filterClient));
    }

    switch (sortBy) {
      case "date_desc":
        filtered.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "date_asc":
        filtered.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
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
    const config = STATUS_CONFIG[status] || {
      color: "bg-gray-100 text-gray-800",
      badge: status || "❓ Inconnu",
    };
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
    if (entry.user_type === "client") {
      return "👤 Client";
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
      if (lowerName === "mbxrepair" || entry.user_name === "mbxrepair@gmail.com") {
        return `🔧 Julie (Tech)`;
      }
    }

    // Dernier fallback
    return `🔧 ${entry.user_name || entry.user_email?.split("@")[0] || "Technicien"}`;
  };

  // Composant d'affichage de l'historique complet avec DATE et HEURE
  const FullHistoryTimeline = ({ historique }) => {
    if (!historique || historique.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm">Aucun historique enregistré pour cet appareil</p>
          <p className="text-xs mt-2 text-gray-600">Les actions seront tracées automatiquement</p>
        </div>
      );
    }

    const getActionIcon = (action) => {
      const icons = {
        creation: "📦",
        modification: "✏️",
        changement_statut: "🔄",
        changement_technicien: "👨‍🔧",
        commentaire: "💬",
      };
      return icons[action] || "📌";
    };

    const getActionColor = (action) => {
      const colors = {
        creation: "border-green-500 bg-green-500/10",
        modification: "border-blue-500 bg-blue-500/10",
        changement_statut: "border-purple-500 bg-purple-500/10",
        changement_technicien: "border-amber-500 bg-amber-500/10",
        commentaire: "border-gray-500 bg-white/5",
      };
      return colors[action] || "border-gray-500 bg-white/5";
    };

    const getActionTitle = (action) => {
      const titles = {
        creation: "📦 Saisie initiale",
        modification: "✏️ Modification",
        changement_statut: "🔄 Changement de statut",
        changement_technicien: "👨‍🔧 Changement de technicien",
        commentaire: "💬 Commentaire",
      };
      return titles[action] || action;
    };

    return (
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10"></div>

        {historique.map((entry, index) => (
          <div key={entry.id} className="relative mb-4 flex items-start group">
            <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-[#1a1d2e] z-10 ${getActionColor(entry.action)}`}>
              <div className={`w-full h-full rounded-full ${getActionColor(entry.action)}`}></div>
            </div>

            <div className={`ml-10 flex-1 rounded-xl p-4 border-l-4 ${getActionColor(entry.action)} transition`}>
              <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getActionIcon(entry.action)}</span>
                  <span className="font-bold text-white text-sm">{getActionTitle(entry.action)}</span>
                </div>
                <div className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                  ⏱️ {formatDateTime(entry.created_at)}
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-2">{entry.description}</p>

              {entry.old_value && entry.new_value && (
                <div className="bg-white/5 rounded-lg p-2 text-xs mt-2">
                  <span className="text-gray-500">🔄</span>{" "}
                  <span className="text-red-400 line-through">{entry.old_value}</span>
                  {" → "}
                  <span className="text-green-400 font-medium">{entry.new_value}</span>
                </div>
              )}

              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">👤 {getUserDisplayName(entry)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${entry.user_type === "client" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {entry.user_type === "client" ? "Client" : "Technicien"}
                  </span>
                </div>
                <button onClick={() => navigator.clipboard.writeText(entry.description)} className="text-gray-500 hover:text-gray-300 text-xs transition" title="Copier">📋</button>
              </div>
            </div>
          </div>
        ))}

        {/* Résumé */}
        <div className="ml-10 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-sm text-amber-400">
          📊 {historique.length} action(s) enregistrée(s)
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400">
            <p className="font-semibold">❌ Erreur</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => loadHistory()}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"
            >
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
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto}
              alt="Photo"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl hover:bg-black/70 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl px-6 py-5 mb-6">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative">
            <h1 className="text-2xl font-black text-white tracking-tight">📜 Historique</h1>
            <p className="text-xs text-white/60 uppercase tracking-widest mt-1">Suivi complet des réparations</p>
          </div>
        </div>

        {/* KPI STATS */}
        {(() => {
          const total = repairs.length;
          const terminees = repairs.filter(r => r.status === "✅ Terminé").length;
          const enCours = repairs.filter(r => !["✅ Terminé","📦 Rendu","🚫 Refus client","❌ KO"].includes(r.status)).length;
          const caTotal = repairs.reduce((s, r) => s + (r.final_price || 0), 0);
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total réparations</div>
                <div className="text-2xl font-black text-amber-400 mt-1">{total}</div>
              </div>
              <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider">En cours</div>
                <div className="text-2xl font-black text-blue-400 mt-1">{enCours}</div>
              </div>
              <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Terminées</div>
                <div className="text-2xl font-black text-green-400 mt-1">{terminees}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl p-4 text-white">
                <div className="text-xs text-white/70 uppercase tracking-wider">CA total HT</div>
                <div className="text-2xl font-black mt-1">{caTotal.toFixed(0)} €</div>
              </div>
            </div>
          );
        })()}

        {/* Barre de recherche */}
        <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="🔍 Rechercher par client, téléphone, appareil, ticket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 transition-all duration-200"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 transition-all"
            >
              <option value="all">Tous les statuts</option>
              {Object.keys(STATUS_CONFIG).map((status) => (
                <option key={status} value={status}>
                  {STATUS_CONFIG[status].badge}
                </option>
              ))}
            </select>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 transition-all"
            >
              <option value="all">Tous les clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Trier :</span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-3 py-1 rounded-lg text-xs transition-all duration-150 ${
                  sortBy === option.value
                    ? "bg-amber-500 text-white shadow-[0_2px_0_rgba(0,0,0,0.3)]"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-2 text-xs text-gray-500">
            {filteredAndSortedRepairs.length} réparation(s) trouvée(s)
          </div>
        </div>

        {/* Liste des réparations */}
        <div className="space-y-2">
          {filteredAndSortedRepairs.length === 0 ? (
            <div className="bg-[#16161d] border border-white/5 rounded-2xl p-8 text-center text-gray-500 text-sm">
              Aucune réparation trouvée
            </div>
          ) : (
            filteredAndSortedRepairs.map((repair) => (
              <div
                key={repair.id}
                className="bg-[#16161d] border border-white/5 hover:border-amber-500/40 hover:bg-[#1a1d2e] rounded-2xl transition-all duration-150 cursor-pointer group"
                onClick={() => openDetails(repair)}
              >
                <div className="p-4 flex items-start gap-4">
                  {/* ID Badge */}
                  <div className="min-w-[52px] text-center">
                    <div className="font-mono font-black text-amber-400 text-base bg-amber-500/10 px-2 py-1 rounded-xl">#{repair.id}</div>
                  </div>
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-white text-sm truncate">{repair.client?.name || "Client inconnu"}</span>
                      {repair.client?.phone && <span className="text-xs text-gray-500">{repair.client.phone}</span>}
                      {getStatusBadge(repair.status)}
                    </div>
                    <div className="text-sm text-blue-300 font-medium truncate">{repair.device || "-"}</div>
                    <div className="text-sm text-gray-500 truncate mt-0.5">{repair.issue || "-"}</div>
                    {repair.technician && <div className="text-xs text-gray-600 mt-1">🔧 {repair.technician}</div>}
                  </div>
                  {/* Prix + Date */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-amber-400">
                      {repair.final_price ? `${Number(repair.final_price).toFixed(0)} €` : repair.estimated_price ? `~${Number(repair.estimated_price).toFixed(0)} €` : "—"}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{new Date(repair.created_at).toLocaleDateString("fr-FR")}</div>
                    {repair.photos?.length > 0 && (
                      <div className="flex gap-0.5 mt-2 justify-end">
                        {repair.photos.slice(0, 3).map((photo, idx) => (
                          <img key={idx} src={photo} className="w-7 h-7 rounded-lg object-cover cursor-pointer opacity-70 hover:opacity-100 transition"
                            onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo); setShowPhotoModal(true); }} alt="" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Détails */}
      {showDetails && selectedRepair && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => closeDetails()}
        >
          <div
            className="bg-[#1a1d2e] border border-white/10 border-t-2 border-t-amber-500 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="sticky top-0 bg-[#1a1d2e] border-b border-white/10 px-5 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  📋 Réparation #{selectedRepair.id}
                </h2>
                <p className="text-xs text-gray-400">
                  Créé le {formatDateTime(selectedRepair.created_at)}
                </p>
              </div>
              <button onClick={closeDetails} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 transition text-sm">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Client */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <h3 className="font-semibold text-amber-400 mb-3 text-sm uppercase tracking-wider">👤 Client</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-gray-500">Nom:</span> <span className="text-white">{selectedRepair.client?.name || "-"}</span></div>
                  <div><span className="text-gray-500">Tél:</span> <span className="text-white">{selectedRepair.client?.phone || "-"}</span></div>
                  <div><span className="text-gray-500">Email:</span> <span className="text-white">{selectedRepair.client?.email || "-"}</span></div>
                  <div><span className="text-gray-500">Code:</span> <span className="font-mono font-bold text-amber-400">{selectedRepair.client?.client_code || "-"}</span></div>
                </div>
              </div>

              {/* Bouton Historique */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowFullHistory(!showFullHistory)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/25 transition-all duration-150 text-sm font-medium"
                >
                  <span>📜</span>
                  <span>{showFullHistory ? "Masquer" : "Afficher"} l'historique</span>
                  <span className="bg-amber-500/20 px-2 py-0.5 rounded-full text-xs">
                    {appareilHistorique.length}
                  </span>
                </button>
                <div className="text-xs text-gray-500">⏱️ Date et heure</div>
              </div>

              {/* Timeline Historique Complet */}
              {showFullHistory && (
                <div className="bg-[#16161d] rounded-xl p-4 border border-amber-500/20">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2 text-sm">
                    <span className="text-xl">📜</span>
                    <span>Historique complet</span>
                    <span className="text-xs text-gray-500 ml-2">⏱️ Actions tracées</span>
                  </h3>
                  <FullHistoryTimeline historique={appareilHistorique} />
                </div>
              )}

              {/* Chronologie réparation */}
              <div className="bg-[#16161d] border border-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-4 border-b border-white/10 pb-2 text-sm uppercase tracking-wider">
                  📅 Chronologie
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-xl border-l-4 border-amber-500">
                    <div className="text-2xl">📥</div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-white text-sm">📝 Saisie initiale</span>
                        <span className="text-xs text-gray-500">⏱️ {formatDateTime(selectedRepair.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">Appareil: {selectedRepair.device || "-"}</p>
                      <p className="text-sm text-gray-400">Panne: {selectedRepair.issue || "-"}</p>
                    </div>
                  </div>

                  {selectedRepair.diagnosis && (
                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-xl border-l-4 border-blue-500">
                      <div className="text-2xl">🔬</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-white text-sm">Diagnostic</span>
                          <span className="text-xs text-gray-500">⏱️ {formatDateTime(selectedRepair.diagnostic_date || selectedRepair.updated_at)}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{selectedRepair.diagnosis}</p>
                      </div>
                    </div>
                  )}

                  {selectedRepair.end_time && (
                    <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-xl border-l-4 border-green-500">
                      <div className="text-2xl">✅</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-white text-sm">Terminée</span>
                          <span className="text-xs text-gray-500">⏱️ {formatDateTime(selectedRepair.end_time)}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">Prix final: <span className="font-bold text-amber-400">{selectedRepair.final_price || 0}€</span></p>
                      </div>
                    </div>
                  )}

                  {selectedRepair.return_date && (
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border-l-4 border-gray-500">
                      <div className="text-2xl">📦</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-white text-sm">Rendu</span>
                          <span className="text-xs text-gray-500">⏱️ {formatDateTime(selectedRepair.return_date)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Appareil + Prix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#16161d] border border-white/5 rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">📱 Appareil</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-500">Modèle:</span> <span className="text-white">{selectedRepair.device || "-"}</span></div>
                    <div><span className="text-gray-500">Panne:</span> <span className="text-white">{selectedRepair.issue || "-"}</span></div>
                    {selectedRepair.imei && <div><span className="text-gray-500">IMEI:</span> <span className="text-white">{selectedRepair.imei}</span></div>}
                  </div>
                </div>
                <div className="bg-[#16161d] border border-white/5 rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">💰 Prix</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-500">Estimé:</span> <span className="text-white">{selectedRepair.estimated_price || 0}€</span></div>
                    <div><span className="text-gray-500">Final:</span> <span className="font-bold text-amber-400">{selectedRepair.final_price || 0}€</span></div>
                  </div>
                </div>
              </div>

              {/* Photos */}
              {selectedRepair.photos && selectedRepair.photos.length > 0 && (
                <div className="bg-[#16161d] border border-white/5 rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">📸 Photos</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedRepair.photos.map((photo, idx) => (
                      <img key={idx} src={photo} className="w-full h-24 object-cover rounded-xl cursor-pointer hover:opacity-90 transition"
                        onClick={() => { setSelectedPhoto(photo); setShowPhotoModal(true); }} alt="" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Boutons */}
            <div className="sticky bottom-0 bg-[#1a1d2e] border-t border-white/10 p-4 flex gap-3">
              <button
                onClick={() => router.push(`/repairs/${selectedRepair.id}`)}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all"
              >
                🔧 Voir et modifier
              </button>
              {!["📦 Rendu", "❌ KO", "🚫 Refus client"].includes(selectedRepair.status) && (
                <button
                  onClick={async () => {
                    const { error } = await supabase.from("repairs").update({ status: "📦 Rendu", return_date: new Date().toISOString() }).eq("id", selectedRepair.id);
                    if (!error) {
                      setSelectedRepair({ ...selectedRepair, status: "📦 Rendu", return_date: new Date().toISOString() });
                      setRepairs((prev) => prev.map((r) => r.id === selectedRepair.id ? { ...r, status: "📦 Rendu" } : r));
                    }
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2.5 rounded-xl font-semibold text-sm transition-all"
                >
                  📦 Marquer Rendu
                </button>
              )}
              <button onClick={closeDetails} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-medium text-sm border border-white/10 transition-all">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
