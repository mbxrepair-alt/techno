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
  "📥 Réceptionné":              "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "🔬 Diagnostic":               "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "✅ Validé client":             "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "🔧 En réparation":            "bg-orange-500/80 text-white border-orange-500",
  "✅ Terminé":                   "bg-green-600 text-white border-green-700",
  "📦 Rendu":                    "bg-gray-700/60 text-gray-400 border-gray-600",
  "❌ KO":                        "bg-red-600 text-white border-red-700",
  "🚫 Refus client":             "bg-red-500/20 text-red-300 border-red-500/30",
  "📤 Envoyé à l'atelier":       "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  "⏳ Attente validation client": "bg-amber-500/20 text-amber-300 border-amber-500/40",
  "🔐 Mot de passe incorrect":   "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "📦 Attente pièce":            "bg-purple-500/20 text-purple-300 border-purple-500/30",
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
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

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
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm">Chargement de l'atelier...</p>
          </div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="w-full">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl px-6 py-5 mb-6">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">🔧 Flux Atelier</h1>
              <p className="text-xs text-white/60 uppercase tracking-widest mt-1">Gestion en temps réel</p>
              {currentTechnician && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                    {currentTechnician.name?.charAt(0)}
                  </div>
                  <span className="text-xs text-white/80 font-medium">
                    ✓ {currentTechnician.name}{currentTechnician.is_gerant && " (Gérant)"}
                  </span>
                </div>
              )}
            </div>
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Rechercher ticket, nom, modèle, panne..."
                className="w-full bg-white/15 border border-white/30 rounded-xl px-4 py-2.5 text-white placeholder-white/50 text-sm outline-none focus:bg-white/20 focus:border-white/50 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* FILTRES */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/15 transition-all duration-200"
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
            className="bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/15 transition-all duration-200"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {(searchTerm || filterStatus !== "all" || filterPeriod !== "all") && (
            <button onClick={resetFilters} className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
              🔄 Réinitialiser
            </button>
          )}
        </div>

        {/* TABLEAU */}
        <div className="bg-[#16161d] rounded-2xl border border-white/5 overflow-hidden">
          <div className="grid grid-cols-12 bg-orange-500/10 px-4 py-3 text-xs font-bold text-orange-400 uppercase tracking-widest border-b border-white/5">
            <div className="col-span-1">Ticket</div>
            <div className="col-span-3">Client / Appareil</div>
            <div className="col-span-2">Panne</div>
            <div className="col-span-1">Âge</div>
            <div className="col-span-2">Technicien</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-1 text-right">Prix</div>
          </div>

          <div className="divide-y divide-white/5">
            {sortedRepairs.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm">Aucune réparation</div>
            ) : (
              sortedRepairs.map((repair) => {
                const dateObj = new Date(repair.created_at);
                const formattedDate = dateObj.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
                const ageMs = Date.now() - dateObj.getTime();
                const ageDays = Math.floor(ageMs / 86400000);
                const ageLabel = ageDays === 0 ? "Auj." : ageDays === 1 ? "1j" : `${ageDays}j`;
                const ageColor = ageDays >= 7 ? "text-red-400" : ageDays >= 3 ? "text-amber-400" : "text-gray-400";
                const isActive = !["✅ Terminé","📦 Rendu","🚫 Refus client","❌ KO"].includes(repair.status);
                return (
                  <div
                    key={repair.id}
                    onClick={() => handleRowClick(repair)}
                    className={`grid grid-cols-12 items-center px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors duration-150 ${!repair.technician && isActive ? "bg-amber-500/5" : ""}`}
                  >
                    <div className="col-span-1">
                      <span className="font-mono font-bold text-orange-400 text-sm bg-orange-500/10 px-2 py-1 rounded-lg">
                        #{repair.id}
                      </span>
                    </div>

                    <div className="col-span-3 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{repair.clients?.name || "Client inconnu"}</div>
                      <div className="text-xs text-blue-300 truncate">{repair.device || "?"}</div>
                    </div>

                    <div className="col-span-2 min-w-0">
                      <div className="text-xs text-gray-400 truncate">{repair.issue || "—"}</div>
                    </div>

                    <div className="col-span-1">
                      <span className={`text-xs font-semibold ${ageColor}`} title={formattedDate}>{ageLabel}</span>
                    </div>

                    <div className="col-span-2">
                      {repair.technician ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 shrink-0 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold">
                            {repair.technician.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-gray-300 truncate">{repair.technician}</span>
                          {currentTechnician?.is_gerant && (
                            <button onClick={(e) => openChangeTechModal(repair, e)} className="shrink-0 text-gray-600 hover:text-orange-400 transition-colors text-xs">✏️</button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">⚠️ Non assigné</span>
                      )}
                    </div>

                    <div className="col-span-2">
                      <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold border truncate max-w-full ${STATUS_STYLE[repair.status] || "bg-gray-700 text-gray-300 border-gray-600"}`}>
                        {repair.status}
                      </span>
                    </div>

                    <div className="col-span-1 text-right font-bold text-orange-400 text-sm">
                      {repair.final_price ? `${Number(repair.final_price).toFixed(0)}€` : repair.estimated_price ? `~${Number(repair.estimated_price).toFixed(0)}€` : "—"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MODAL AVERTISSEMENT */}
        {showWarningModal && pendingRepair && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#232742] border border-white/10 border-t-2 border-t-orange-500 rounded-2xl p-6 w-96 shadow-2xl">
              <div className="text-center mb-4">
                <div className="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-bold text-white">Attention !</h3>
              </div>
              <p className="text-gray-400 text-sm text-center mb-2">Cette réparation est déjà assignée à :</p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center mb-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                    {pendingRepair.technician?.charAt(0)}
                  </div>
                  <span className="font-semibold text-white">{pendingRepair.technician}</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm text-center mb-5">
                Voulez-vous prendre la main sur cette réparation ?<br />
                <span className="text-xs text-gray-500">Le précédent technicien n'aura plus accès</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowWarningModal(false); setPendingRepair(null); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-medium text-sm border border-white/10 transition-all"
                >
                  ❌ Annuler
                </button>
                <button
                  onClick={takeOverRepair}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all"
                >
                  ✅ Prendre la main
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CHANGEMENT TECHNICIEN */}
        {showChangeTechModal && changingRepair && currentTechnician?.is_gerant && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#232742] border border-white/10 border-t-2 border-t-orange-500 rounded-2xl p-6 w-96 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-1">👨‍🔧 Changer le technicien</h3>
              <p className="text-sm text-gray-400 mb-4">Réparation #{changingRepair.id}</p>
              <select
                value={selectedNewTech}
                onChange={(e) => setSelectedNewTech(e.target.value)}
                className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/15 mb-4 transition-all"
              >
                <option value="">-- Sélectionner --</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.name}>{tech.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={changeTechnician}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setShowChangeTechModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-medium text-sm border border-white/10 transition-all"
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
