"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { addHistoriqueAction, getCurrentTechnician } from "../../lib/historique";

// ========== NORMALISATION DES STATUTS ==========
const normalizeStatus = (status) => {
  if (!status) return "📥 Réceptionné";

  const statusLower = status.toLowerCase().trim();

  const statusMap = {
    réceptionné: "📥 Réceptionné",
    receptionne: "📥 Réceptionné",
    reçu: "📥 Réceptionné",
    recu: "📥 Réceptionné",
    diagnostic: "🔬 Diagnostic",
    "validé client": "✅ Validé client",
    "valide client": "✅ Validé client",
    "en réparation": "🔧 En réparation",
    reparation: "🔧 En réparation",
    terminé: "✅ Terminé",
    termine: "✅ Terminé",
    rendu: "📦 Rendu",
    ko: "❌ KO",
    irréparable: "❌ KO",
    "refus client": "🚫 Refus client",
    refus: "🚫 Refus client",
    "envoyé à l'atelier": "📤 Envoyé à l'atelier",
    "envoye atelier": "📤 Envoyé à l'atelier",
    "attente validation client": "⏳ Attente validation client",
    "attente validation": "⏳ Attente validation client",
    "mot de passe incorrect": "🔐 Mot de passe incorrect",
    "mdp incorrect": "🔐 Mot de passe incorrect",
    "attente pièce": "📦 Attente pièce",
    "attente piece": "📦 Attente pièce",
  };

  if (statusMap[statusLower]) return statusMap[statusLower];

  const emojiStatus = ["📥", "🔬", "✅", "🔧", "📦", "❌", "🚫", "📤", "⏳", "🔐"];
  if (emojiStatus.some((e) => status.includes(e))) return status;

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
  const [showChangeTechModal, setShowChangeTechModal] = useState(false);
  const [changingRepair, setChangingRepair] = useState(null);
  const [selectedNewTech, setSelectedNewTech] = useState("");
  const [currentTechnician, setCurrentTechnician] = useState(null);

  // État pour le modal d'avertissement
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingRepair, setPendingRepair] = useState(null);

  useEffect(() => {
    loadCurrentTechnician();
    loadData();
    loadTechnicians();

    const repairsChannel = supabase
      .channel("repairs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "repairs" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(repairsChannel);
    };
  }, []);

  const loadCurrentTechnician = async () => {
    try {
      const tech = getCurrentTechnician();
      setCurrentTechnician(tech);
      console.log("Technicien connecté:", tech);
    } catch (error) {
      console.error("Erreur chargement technicien:", error);
    }
  };

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

  const loadData = async () => {
    const user = await getCurrentUser();
    if (!user) return router.push("/login");

    const { data: repairsData } = await supabase
      .from("repairs")
      .select("*, clients(*)")
      .eq("user_id", user.id);

    const normalizedRepairs = (repairsData || []).map((repair) => ({
      ...repair,
      status: normalizeStatus(repair.status),
    }));

    setRepairs(normalizedRepairs);
    setLoading(false);
  };

  const changeTechnician = async () => {
    if (!changingRepair || !selectedNewTech) return;

    const oldTechnician = changingRepair.technician;

    await supabase
      .from("repairs")
      .update({ technician: selectedNewTech, repaired_by: selectedNewTech })
      .eq("id", changingRepair.id);

    // Enregistrer dans l'historique
    await addHistoriqueAction({
      repairId: changingRepair.id,
      action: "changement_technicien",
      description: `Changement de technicien : "${oldTechnician || "Non assigné"}" → "${selectedNewTech}"`,
      oldValue: oldTechnician || "Non assigné",
      newValue: selectedNewTech,
    });

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

  // Auto-assignation avec historique
  const assignRepairToCurrentTechnician = async (repair) => {
    if (!currentTechnician) return;

    const oldTechnician = repair.technician;

    await supabase
      .from("repairs")
      .update({
        technician: currentTechnician.name,
        repaired_by: currentTechnician.name,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", repair.id);

    // Enregistrer dans l'historique
    await addHistoriqueAction({
      repairId: repair.id,
      action: "changement_technicien",
      description: `Assignation automatique à ${currentTechnician.name}`,
      oldValue: oldTechnician || "Non assigné",
      newValue: currentTechnician.name,
    });

    await loadData();
  };

  // Gestion du clic avec avertissement
  const handleRowClick = async (repair) => {
    // Si c'est un gérant, pas d'avertissement
    if (currentTechnician?.is_gerant) {
      router.push(`/repairs/${repair.id}`);
      return;
    }

    // Cas 1 : Réparation non assignée -> assigner directement
    if (!repair.technician) {
      await assignRepairToCurrentTechnician(repair);
      router.push(`/repairs/${repair.id}`);
      return;
    }

    // Cas 2 : Réparation assignée à un autre technicien -> avertissement
    if (repair.technician !== currentTechnician?.name) {
      setPendingRepair(repair);
      setShowWarningModal(true);
      return;
    }

    // Cas 3 : Réparation déjà assignée au technicien connecté -> accès direct
    router.push(`/repairs/${repair.id}`);
  };

  // Prendre la main sur une réparation (pour le 2ème technicien)
  const takeOverRepair = async () => {
    if (!pendingRepair || !currentTechnician) return;

    const oldTechnician = pendingRepair.technician;

    await supabase
      .from("repairs")
      .update({
        technician: currentTechnician.name,
        repaired_by: currentTechnician.name,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", pendingRepair.id);

    // Enregistrer dans l'historique
    await addHistoriqueAction({
      repairId: pendingRepair.id,
      action: "changement_technicien",
      description: `${currentTechnician.name} a pris la main sur la réparation (était à ${oldTechnician})`,
      oldValue: oldTechnician,
      newValue: currentTechnician.name,
    });

    setShowWarningModal(false);
    await loadData();
    router.push(`/repairs/${pendingRepair.id}`);
  };

  const statsByStatus = useMemo(() => {
    const stats = {};
    Object.keys(STATUS_ORDER).forEach((status) => {
      stats[status] = repairs.filter((r) => r.status === status).length;
    });
    return stats;
  }, [repairs]);

  const sortedRepairs = useMemo(() => {
    let filtered = [...repairs];

    if (searchTerm) {
      filtered = filtered.filter((r) =>
        (r.clients?.name + r.device + r.id + r.issue)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    if (filterPeriod !== "all") {
      const period = PERIOD_OPTIONS.find((p) => p.value === filterPeriod);
      if (period && period.days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - period.days);
        filtered = filtered.filter((r) => new Date(r.created_at) >= cutoffDate);
      }
    }

    return filtered.sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] || 99;
      const orderB = STATUS_ORDER[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [repairs, searchTerm, filterStatus, filterPeriod]);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterPeriod("all");
  };

  const totalRepairs = repairs.length;

  if (loading)
    return (
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
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              🔧 Flux Atelier
            </h1>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mt-1">
              Gestion en temps réel
            </p>
            {currentTechnician && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">
                  {currentTechnician.name?.charAt(0)}
                </div>
                <span className="text-xs text-green-600 font-medium">
                  ✓ Connecté : {currentTechnician.name}
                  {currentTechnician.is_gerant && " (Gérant)"}
                </span>
              </div>
            )}
          </div>

          {/* BARRE DE RECHERCHE */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="🔍 Rechercher par ticket, nom, modèle ou panne..."
              className="w-full p-2.5 pl-10 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">🔍</div>
          </div>
        </div>

        {/* FILTRES */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border-2 border-blue-200 rounded-xl text-sm"
          >
            <option value="all">📊 Tous ({totalRepairs})</option>
            {Object.keys(STATUS_ORDER).map((status) => (
              <option key={status} value={status}>
                {status} ({statsByStatus[status] || 0})
              </option>
            ))}
          </select>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-3 py-1.5 bg-white border-2 border-blue-200 rounded-xl text-sm"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {(searchTerm || filterStatus !== "all" || filterPeriod !== "all") && (
            <button onClick={resetFilters} className="text-sm text-blue-500 hover:text-blue-600">
              🔄 Réinitialiser
            </button>
          )}
        </div>

        {/* TABLEAU DES REPARATIONS */}
        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-md overflow-hidden">
          <div className="grid grid-cols-12 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-600 border-b border-blue-200">
            <div className="col-span-2">Ticket</div>
            <div className="col-span-4">Client / Appareil</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Technicien</div>
            <div className="col-span-1">Statut</div>
            <div className="col-span-1 text-right">Prix</div>
          </div>

          <div className="divide-y divide-blue-100">
            {sortedRepairs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Aucune réparation</div>
            ) : (
              sortedRepairs.map((repair) => {
                const dateObj = new Date(repair.created_at);
                const formattedDate = dateObj.toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                });

                return (
                  <div
                    key={repair.id}
                    onClick={() => handleRowClick(repair)}
                    className={`grid grid-cols-12 items-center px-4 py-3 cursor-pointer hover:bg-blue-50 transition ${
                      !repair.technician ? "bg-yellow-50/30" : ""
                    }`}
                  >
                    <div className="col-span-2">
                      <span className="font-mono font-bold text-blue-600 text-sm bg-blue-50 px-2 py-1 rounded-lg">
                        #{repair.id}
                      </span>
                    </div>

                    <div className="col-span-4">
                      <div className="font-bold text-gray-900 text-sm">
                        {repair.clients?.name || "Client inconnu"}
                      </div>
                      <div className="text-xs text-gray-500">{repair.device || "?"}</div>
                    </div>

                    <div className="col-span-2 text-sm text-gray-600">{formattedDate}</div>

                    <div className="col-span-2">
                      {repair.technician ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">
                            {repair.technician.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {repair.technician}
                          </span>
                          {currentTechnician?.is_gerant && (
                            <button
                              onClick={(e) => openChangeTechModal(repair, e)}
                              className="text-gray-400 hover:text-blue-500"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            ⚠️ Non assigné
                          </span>
                          {currentTechnician && !currentTechnician.is_gerant && (
                            <span className="text-xs text-blue-500">(Cliquez pour prendre)</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="col-span-1">
                      <span
                        className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold border ${STATUS_STYLE[repair.status] || "bg-gray-100"}`}
                      >
                        {repair.status}
                      </span>
                    </div>

                    <div className="col-span-1 text-right font-bold text-blue-600 text-sm">
                      {repair.final_price || repair.estimated_price || 0}€
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MODAL D'AVERTISSEMENT - TECHNICIEN DÉJÀ ASSIGNÉ */}
        {showWarningModal && pendingRepair && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-96 border-2 border-orange-200 shadow-2xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-xl font-bold text-orange-600">Attention !</h3>
              </div>

              <p className="text-gray-700 text-center mb-2">
                Cette réparation est déjà assignée à :
              </p>
              <div className="bg-gray-100 rounded-lg p-3 text-center mb-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {pendingRepair.technician?.charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-800">{pendingRepair.technician}</span>
                </div>
              </div>

              <p className="text-gray-600 text-sm text-center mb-5">
                Voulez-vous prendre la main sur cette réparation ?
                <br />
                <span className="text-xs text-gray-400">
                  Le précédent technicien n'aura plus accès
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                    setPendingRepair(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  ❌ Annuler
                </button>
                <button
                  onClick={takeOverRepair}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition font-medium"
                >
                  ✅ Prendre la main
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CHANGEMENT TECHNICIEN (pour gérants uniquement) */}
        {showChangeTechModal && changingRepair && currentTechnician?.is_gerant && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-96">
              <h3 className="text-lg font-bold mb-2">👨‍🔧 Changer le technicien</h3>
              <p className="text-sm text-gray-500 mb-3">Réparation #{changingRepair.id}</p>
              <select
                value={selectedNewTech}
                onChange={(e) => setSelectedNewTech(e.target.value)}
                className="w-full p-2 border rounded-lg mb-3"
              >
                <option value="">-- Sélectionner --</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.name}>
                    {tech.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={changeTechnician}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setShowChangeTechModal(false)}
                  className="flex-1 bg-gray-200 py-2 rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
