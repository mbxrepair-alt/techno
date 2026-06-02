"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";

// ========== NORMALISATION DES STATUTS ==========
const normalizeStatus = (status) => {
  if (!status) return "📥 Réceptionné";
  
  const statusLower = status.toLowerCase().trim();
  
  const statusMap = {
    "réceptionné": "📥 Réceptionné",
    "receptionne": "📥 Réceptionné",
    "reçu": "📥 Réceptionné",
    "recu": "📥 Réceptionné",
    "diagnostic": "🔬 Diagnostic",
    "validé client": "✅ Validé client",
    "valide client": "✅ Validé client",
    "en réparation": "🔧 En réparation",
    "reparation": "🔧 En réparation",
    "terminé": "✅ Terminé",
    "termine": "✅ Terminé",
    "rendu": "📦 Rendu",
    "ko": "❌ KO",
    "irréparable": "❌ KO",
    "refus client": "🚫 Refus client",
    "refus": "🚫 Refus client",
    "envoyé à l'atelier": "📤 Envoyé à l'atelier",
    "envoye atelier": "📤 Envoyé à l'atelier",
    "attente validation client": "⏳ Attente validation client",
    "attente validation": "⏳ Attente validation client",
    "mot de passe incorrect": "🔐 Mot de passe incorrect",
    "mdp incorrect": "🔐 Mot de passe incorrect",
    "attente pièce": "📦 Attente pièce",
    "attente piece": "📦 Attente pièce"
  };
  
  if (statusMap[statusLower]) return statusMap[statusLower];
  
  const emojiStatus = ["📥", "🔬", "✅", "🔧", "📦", "❌", "🚫", "📤", "⏳", "🔐"];
  if (emojiStatus.some(e => status.includes(e))) return status;
  
  return "📥 Réceptionné";
};

// Ordre des statuts
const STATUS_ORDER = {
  "📥 Réceptionné": 1,
  "🔬 Diagnostic": 2,
  "✅ Validé client": 3,
  "🔧 En réparation": 4,
  "✅ Terminé": 5,
  "📦 Rendu": 6,
  "❌ KO": 7,
  "🚫 Refus client": 8,
  "📤 Envoyé à l'atelier": 9,
  "⏳ Attente validation client": 10,
  "🔐 Mot de passe incorrect": 11,
  "📦 Attente pièce": 12,
};

const STATUS_STYLE = {
  "📥 Réceptionné": "bg-blue-100 text-blue-800 border-blue-200",
  "🔬 Diagnostic": "bg-blue-100 text-blue-800 border-blue-200",
  "✅ Validé client": "bg-blue-100 text-blue-800 border-blue-200",
  "🔧 En réparation": "bg-blue-500 text-white border-blue-600",
  "✅ Terminé": "bg-blue-600 text-white border-blue-700",
  "📦 Rendu": "bg-gray-100 text-gray-600 border-gray-200",
  "❌ KO": "bg-red-500 text-white border-red-600",
  "🚫 Refus client": "bg-red-500 text-white border-red-600",
  "📤 Envoyé à l'atelier": "bg-blue-100 text-blue-800 border-blue-200",
  "⏳ Attente validation client": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "🔐 Mot de passe incorrect": "bg-red-500 text-white border-red-600",
  "📦 Attente pièce": "bg-purple-100 text-purple-800 border-purple-200",
};

const PERIOD_OPTIONS = [
  { value: "all", label: "📅 Toute la période", days: null },
  { value: "today", label: "📅 Aujourd'hui", days: 1 },
  { value: "week", label: "📅 Cette semaine", days: 7 },
  { value: "month", label: "📅 Ce mois", days: 30 },
];

export default function RepairsPage() {
  const router = useRouter();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [technicians, setTechnicians] = useState([]);
  const [showTechModal, setShowTechModal] = useState(false);
  const [newTechName, setNewTechName] = useState("");
  const [selectedRepairId, setSelectedRepairId] = useState(null);
  const [showTechSelectModal, setShowTechSelectModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [techToDelete, setTechToDelete] = useState(null);
  const [showChangeTechModal, setShowChangeTechModal] = useState(false);
  const [changingRepair, setChangingRepair] = useState(null);
  const [selectedNewTech, setSelectedNewTech] = useState("");

  useEffect(() => {
    loadData();
    loadTechnicians();
    
    const repairsChannel = supabase
      .channel('repairs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'repairs' }, () => {
        loadData();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(repairsChannel);
    };
  }, []);

  const loadTechnicians = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const { data } = await supabase
        .from("technicians")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);
      setTechnicians(data || []);
    } catch (error) {
      console.error("Erreur chargement techniciens:", error);
    }
  };

  const addTechnician = async () => {
    if (!newTechName.trim()) return;
    const user = await getCurrentUser();
    await supabase.from("technicians").insert([{ name: newTechName, user_id: user.id, is_active: true }]);
    setNewTechName("");
    setShowTechModal(false);
    loadTechnicians();
  };

  const deleteTechnician = async () => {
    if (!techToDelete) return;
    await supabase
      .from("technicians")
      .update({ is_active: false })
      .eq("id", techToDelete.id);
    setShowDeleteConfirm(false);
    setTechToDelete(null);
    loadTechnicians();
    
    await supabase
      .from("repairs")
      .update({ technician: null, repaired_by: null })
      .eq("technician", techToDelete.name);
    loadData();
  };

  const changeTechnician = async () => {
    if (!changingRepair || !selectedNewTech) return;
    
    await supabase
      .from("repairs")
      .update({ technician: selectedNewTech, repaired_by: selectedNewTech })
      .eq("id", changingRepair.id);
    
    setShowChangeTechModal(false);
    setChangingRepair(null);
    setSelectedNewTech("");
    loadData();
  };

  const openChangeTechModal = (repair, e) => {
    e.stopPropagation();
    setChangingRepair(repair);
    setSelectedNewTech(repair.technician || "");
    setShowChangeTechModal(true);
  };

  const assignTechnicianAndOpen = async (repairId, technicianName) => {
    await supabase
      .from("repairs")
      .update({ technician: technicianName, repaired_by: technicianName })
      .eq("id", repairId);
    setShowTechSelectModal(false);
    setSelectedRepairId(null);
    router.push(`/repairs/${repairId}`);
  };

  const handleRowClick = (repair) => {
    if (!repair.technician) {
      setSelectedRepairId(repair.id);
      setShowTechSelectModal(true);
    } else {
      router.push(`/repairs/${repair.id}`);
    }
  };

  const loadData = async () => {
    const user = await getCurrentUser();
    if (!user) return router.push("/login");

    const { data: repairsData } = await supabase
      .from("repairs")
      .select("*, clients(*)")
      .eq("user_id", user.id);

    const normalizedRepairs = (repairsData || []).map(repair => ({
      ...repair,
      status: normalizeStatus(repair.status)
    }));

    setRepairs(normalizedRepairs);
    setLoading(false);
  };

  const statsByStatus = useMemo(() => {
    const stats = {};
    Object.keys(STATUS_ORDER).forEach(status => {
      stats[status] = repairs.filter(r => r.status === status).length;
    });
    return stats;
  }, [repairs]);

  const sortedRepairs = useMemo(() => {
    let filtered = [...repairs];
    
    if (searchTerm) {
      filtered = filtered.filter(r => 
        (r.clients?.name + r.device + r.id + r.issue).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== "all") {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    
    if (filterPeriod !== "all") {
      const period = PERIOD_OPTIONS.find(p => p.value === filterPeriod);
      if (period && period.days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - period.days);
        filtered = filtered.filter(r => new Date(r.created_at) >= cutoffDate);
      }
    }
    
    return filtered.sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] || 99;
      const orderB = STATUS_ORDER[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [repairs, searchTerm, filterStatus, filterPeriod]);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterPeriod("all");
  };

  const totalRepairs = repairs.length;

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 font-medium">Chargement de l'atelier...</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="w-full mx-auto px-2 sm:px-3 md:px-4 py-3">
        
        {/* HEADER AVEC BARRE DE RECHERCHE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              🔧 Flux Atelier
            </h1>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mt-1">
              Gestion en temps réel
            </p>
          </div>

          {/* BARRE DE RECHERCHE */}
          <div className="relative w-full md:w-80">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-300"></div>
              <input 
                type="text" 
                placeholder="🔍 Rechercher par ticket, nom, modèle ou panne..." 
                className="relative w-full p-2.5 pl-10 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400 shadow-[0_0_10px_rgba(37,99,235,0.1)] focus:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">🔍</div>
              {searchTerm && (
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition"
                  onClick={() => setSearchTerm("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* FILTRES */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Statut :</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">📊 Tous ({totalRepairs})</option>
                {Object.keys(STATUS_ORDER).map((status) => {
                  const count = statsByStatus[status] || 0;
                  return (
                    <option key={status} value={status}>
                      {status} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Période :</span>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-3 py-1.5 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PERIOD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* BOUTON GÉRER LES TECHNICIENS */}
          <div className="relative">
            <button
              onClick={() => setShowTechModal(!showTechModal)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <span>👨‍🔧</span>
              <span>Gérer les techniciens</span>
              <svg className={`w-3 h-3 transition-transform duration-200 ${showTechModal ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showTechModal && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border-2 border-blue-200 shadow-xl z-50 overflow-hidden">
                <div className="p-3 bg-blue-50 border-b border-blue-200">
                  <h3 className="font-bold text-blue-800">Ajouter un technicien</h3>
                  <div className="flex mt-2">
                    <input 
                      type="text" 
                      className="flex-1 border-2 border-blue-200 rounded-l-lg p-2 text-sm focus:border-blue-500 focus:outline-none" 
                      placeholder="Nom" 
                      value={newTechName} 
                      onChange={(e) => setNewTechName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTechnician()}
                    />
                    <button onClick={addTechnician} className="bg-blue-600 text-white px-3 rounded-r-lg hover:bg-blue-700">+</button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {technicians.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm p-4">Aucun technicien</p>
                  ) : (
                    technicians.map((tech) => (
                      <div key={tech.id} className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {tech.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{tech.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            setTechToDelete(tech);
                            setShowDeleteConfirm(true);
                            setShowTechModal(false);
                          }}
                          className="text-red-500 hover:text-red-700 transition p-1"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOUTON RÉINITIALISER */}
        {(searchTerm || filterStatus !== "all" || filterPeriod !== "all") && (
          <div className="flex justify-end mb-3">
            <button
              onClick={resetFilters}
              className="text-sm font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              🔄 Réinitialiser
            </button>
          </div>
        )}

        {/* TABLEAU DES TICKETS - PLEINE LARGEUR */}
        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-12 bg-gradient-to-r from-blue-50 to-white px-4 py-3 text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-200">
              <div className="col-span-2">Ticket</div>
              <div className="col-span-4">Client / Appareil</div>
              <div className="col-span-2">Date / Heure</div>
              <div className="col-span-2">Technicien</div>
              <div className="col-span-1">Statut</div>
              <div className="col-span-1 text-right">Prix</div>
            </div>

            <div className="divide-y divide-blue-100">
              {sortedRepairs.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="font-bold uppercase tracking-wider">Aucune réparation</p>
                  <p className="text-sm mt-1">Modifie les filtres ou crée une nouvelle réparation</p>
                </div>
              ) : (
                sortedRepairs.map((repair) => {
                  const dateObj = new Date(repair.created_at);
                  const formattedDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  const formattedTime = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={repair.id}
                      onClick={() => handleRowClick(repair)}
                      className={`grid grid-cols-12 items-center px-4 py-3 transition-all cursor-pointer ${
                        repair.technician 
                          ? "hover:bg-blue-50/50" 
                          : "bg-yellow-50/30 hover:bg-yellow-50/70"
                      }`}
                    >
                      <div className="col-span-2">
                        <span className="font-mono font-bold text-blue-600 text-sm bg-blue-50 px-2 py-1 rounded-lg">
                          #{repair.id}
                        </span>
                      </div>

                      <div className="col-span-4 pr-3">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{repair.clients?.name || "Client inconnu"}</span>
                          <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-blue-200">
                            {repair.device?.substring(0, 18) || "?"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-blue-500">🛠️</span>
                          <p className="text-xs text-gray-500 font-medium line-clamp-1">
                            {repair.issue || "Panne non spécifiée"}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <p className="text-sm font-semibold text-gray-800">{formattedDate}</p>
                        <p className="text-xs text-blue-500 font-mono">{formattedTime}</p>
                      </div>

                      <div className="col-span-2">
                        {repair.technician ? (
                          <div className="flex items-center gap-2 group/tech">
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 rounded-lg px-2 py-1 transition"
                              onClick={(e) => openChangeTechModal(repair, e)}
                            >
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                {repair.technician.charAt(0)}
                              </div>
                              <span className="text-xs font-medium text-gray-700 group-hover/tech:text-blue-600">
                                {repair.technician.length > 10 ? repair.technician.substring(0, 8) + '...' : repair.technician}
                              </span>
                              <svg className="w-3 h-3 text-gray-400 group-hover/tech:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            ⚠️ Non assigné
                          </span>
                        )}
                      </div>

                      <div className="col-span-1">
                        <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold border ${STATUS_STYLE[repair.status]}`}>
                          {repair.status}
                        </span>
                      </div>

                      <div className="col-span-1 text-right">
                        <span className="text-sm font-bold text-blue-600">
                          {repair.final_price || repair.estimated_price || 0}€
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* MODAL CHANGEMENT DE TECHNICIEN */}
        {showChangeTechModal && changingRepair && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-96 border-2 border-blue-200 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2">👨‍🔧 Changer le technicien</h3>
              <p className="text-sm text-gray-500 mb-3">Réparation #{changingRepair.id}</p>
              <select
                value={selectedNewTech}
                onChange={(e) => setSelectedNewTech(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              >
                <option value="">-- Sélectionner --</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.name}>{tech.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={changeTechnician} disabled={!selectedNewTech} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">Confirmer</button>
                <button onClick={() => { setShowChangeTechModal(false); setChangingRepair(null); setSelectedNewTech(""); }} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300 transition">Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CONFIRMATION SUPPRESSION TECHNICIEN */}
        {showDeleteConfirm && techToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-96 border-2 border-red-200 shadow-2xl">
              <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ Confirmer la suppression</h3>
              <p className="text-sm text-gray-600 mb-3">Supprimer <span className="font-bold">{techToDelete.name}</span> ?</p>
              <div className="flex gap-2">
                <button onClick={deleteTechnician} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition">Supprimer</button>
                <button onClick={() => { setShowDeleteConfirm(false); setTechToDelete(null); }} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300 transition">Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL SÉLECTIONNER TECHNICIEN */}
        {showTechSelectModal && selectedRepairId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-96 border-2 border-blue-200 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2">👨‍🔧 Sélectionner un technicien</h3>
              <p className="text-sm text-gray-500 mb-3">Cette réparation n'est pas encore assignée.</p>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {technicians.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm">Aucun technicien</p>
                ) : (
                  technicians.map((tech) => (
                    <button key={tech.id} onClick={() => assignTechnicianAndOpen(selectedRepairId, tech.name)} className="w-full flex items-center gap-3 p-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">{tech.name.charAt(0)}</div>
                      <span className="font-medium text-gray-700 text-sm">{tech.name}</span>
                    </button>
                  ))
                )}
              </div>
              <button onClick={() => { setShowTechSelectModal(false); setSelectedRepairId(null); }} className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition">Annuler</button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}