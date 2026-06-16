"use client";

import { useState, useEffect } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { BarChart3, TrendingUp, Wrench, CheckCircle2, Wallet, Users, Clock, Zap, ShoppingBag } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function StatistiquesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRepairs: 0,
    completedRepairs: 0,
    inProgressRepairs: 0,
    pendingRepairs: 0,
    totalRevenue: 0,
    repairsRevenue: 0,
    salesRevenue: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    activeTechnicians: 0,
    clientSatisfaction: 98,
    avgRepairTime: 0,
    topTechnicians: [] as { name: string; count: number }[],
    repairsByStatus: [] as { name: string; value: number }[],
    repairsByMonth: [] as { name: string; réparations: number }[],
    revenueByMonth: [] as { name: string; revenu: number; ventes: number }[],
    repairsByDevice: [] as { name: string; value: number }[],
    recentRepairs: [] as { id: number; client: string; device: string; status: string; price: number; date: string }[],
  });
  const [period, setPeriod] = useState("month");
  const [currentTechnician, setCurrentTechnician] = useState<any>(null);
  const [isGerant, setIsGerant] = useState(false);

  useEffect(() => {
    loadCurrentTechnician();
    loadStats();
  }, [period]);

  const loadCurrentTechnician = async () => {
    const techPermissions = localStorage.getItem("technician_permissions");
    if (techPermissions) {
      const tech = JSON.parse(techPermissions);
      setCurrentTechnician(tech);
      setIsGerant(tech.is_gerant === true);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) {
        router.push("/login");
        return;
      }

      let query = supabase.from("repairs").select("*").eq("user_id", companyId);
      if (!isGerant && currentTechnician) {
        query = query.eq("technician", currentTechnician.name);
      }
      const { data: repairs } = await query;

      const { data: technicians } = await supabase
        .from("technicians")
        .select("*")
        .eq("user_id", companyId)
        .eq("is_active", true);

      const { data: sales } = await supabase
        .from("product_sales").select("total, sold_at, quantity").eq("user_id", companyId);

      const totalRepairs = repairs?.length || 0;
      const completedRepairs = repairs?.filter((r) => r.status === "✅ Terminé" || r.status === "📦 Rendu").length || 0;
      const inProgressRepairs = repairs?.filter((r) => r.status === "🔧 En réparation").length || 0;
      const pendingRepairs = repairs?.filter((r) => !r.status || r.status === "📥 Réceptionné").length || 0;
      const repairsRevenue = repairs?.reduce((sum, r) => sum + (r.final_price || 0), 0) || 0;
      const salesRevenue = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const totalRevenue = repairsRevenue + salesRevenue;
      const totalSales = sales?.length || 0;

      const statusCounts: Record<string, number> = {};
      repairs?.forEach((r) => {
        const status = r.status || "📥 Réceptionné";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const repairsByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      const monthNames = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];
      const last6Months: { month: string; year: number; count: number; revenue: number; salesRev: number }[] = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        last6Months.push({ month: monthNames[d.getMonth()], year: d.getFullYear(), count: 0, revenue: 0, salesRev: 0 });
      }

      repairs?.forEach((r) => {
        const date = new Date(r.created_at);
        const monthKey = monthNames[date.getMonth()];
        const monthData = last6Months.find((m) => m.month === monthKey);
        if (monthData) { monthData.count++; monthData.revenue += r.final_price || 0; }
      });

      sales?.forEach((s) => {
        const date = new Date(s.sold_at);
        const monthKey = monthNames[date.getMonth()];
        const monthData = last6Months.find((m) => m.month === monthKey);
        if (monthData) { monthData.revenue += s.total || 0; monthData.salesRev += s.total || 0; }
      });

      const repairsByMonth = last6Months.map((m) => ({ name: m.month, réparations: m.count }));
      const revenueByMonth = last6Months.map((m) => ({ name: m.month, revenu: m.revenue, ventes: m.salesRev }));

      const techRepairCount: Record<string, number> = {};
      repairs?.forEach((r) => {
        if (r.technician) techRepairCount[r.technician] = (techRepairCount[r.technician] || 0) + 1;
      });
      const topTechnicians = Object.entries(techRepairCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      const deviceCounts: Record<string, number> = {};
      repairs?.forEach((r) => {
        const deviceKey = (r.device || "Autre").split(" ")[0];
        deviceCounts[deviceKey] = (deviceCounts[deviceKey] || 0) + 1;
      });
      const repairsByDevice = Object.entries(deviceCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 5);

      let totalRepairDays = 0, completedWithDates = 0;
      repairs?.forEach((r) => {
        if (r.end_time && r.created_at) {
          const days = Math.ceil((new Date(r.end_time).getTime() - new Date(r.created_at).getTime()) / 86400000);
          totalRepairDays += days; completedWithDates++;
        }
      });
      const avgRepairTime = completedWithDates > 0 ? Math.round(totalRepairDays / completedWithDates) : 3;

      const recentRepairs = repairs?.slice(0, 8).map((r) => ({
        id: r.id,
        client: r.client_name || "Client",
        device: r.device,
        status: r.status || "📥 Réceptionné",
        price: r.final_price || r.estimated_price || 0,
        date: new Date(r.created_at).toLocaleDateString("fr-FR"),
      })) || [];

      setStats({
        totalRepairs, completedRepairs, inProgressRepairs, pendingRepairs,
        totalRevenue, repairsRevenue, salesRevenue, totalSales,
        monthlyRevenue: revenueByMonth[revenueByMonth.length - 1]?.revenu || 0,
        activeTechnicians: technicians?.length || 0,
        clientSatisfaction: 98, avgRepairTime,
        topTechnicians, repairsByStatus, repairsByMonth, revenueByMonth, repairsByDevice, recentRepairs,
      });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#f97316","#06b6d4","#8b5cf6","#10b981","#eab308","#3b82f6","#ec4899"];

  const completionRate = stats.totalRepairs > 0 ? Math.round((stats.completedRepairs / stats.totalRepairs) * 100) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 shadow-2xl text-xs">
          <p className="text-gray-400 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="font-semibold">
              {p.name}: {typeof p.value === "number" && p.name !== "réparations" ? `${p.value.toLocaleString()}€` : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96 bg-[#0f0f13] min-h-screen">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-white/5"></div>
              <div className="absolute inset-0 rounded-full border-t-2 border-orange-500 animate-spin"></div>
              <BarChart3 size={20} className="absolute inset-0 m-auto text-orange-400" />
            </div>
            <p className="text-gray-600 text-sm">Chargement des statistiques...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#0f0f13] min-h-screen px-0 py-4 space-y-5">

        {/* HEADER */}
        <div className="bg-[#16161d] border border-white/8 rounded-2xl px-5 py-4 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-400" /> Statistiques
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-widest">
              {isGerant ? "Vision globale de l'atelier" : `Stats de ${currentTechnician?.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {["week","month","year"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  period === p
                    ? "bg-orange-500 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {p === "week" ? "Semaine" : p === "month" ? "Mois" : "Année"}
              </button>
            ))}
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* CA Total */}
          <div className="col-span-2 lg:col-span-1 bg-[#16161d] border border-white/8 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -translate-y-6 translate-x-6" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">CA Total</span>
              <div className="w-8 h-8 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Wallet size={14} className="text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{stats.totalRevenue.toLocaleString("fr-FR")}€</p>
            <div className="mt-2 flex gap-2 text-[10px] text-gray-600">
              <span className="text-gray-500">🔧 {stats.repairsRevenue.toLocaleString()}€</span>
              <span>·</span>
              <span className="text-gray-500">🛍️ {stats.salesRevenue.toLocaleString()}€</span>
            </div>
          </div>

          {/* Réparations */}
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -translate-y-4 translate-x-4" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Réparations</span>
              <div className="w-8 h-8 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <Wrench size={14} className="text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{stats.totalRepairs}</p>
            <p className="text-[10px] text-gray-600 mt-1">{stats.inProgressRepairs} en cours</p>
          </div>

          {/* Terminées */}
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -translate-y-4 translate-x-4" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Terminées</span>
              <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{stats.completedRepairs}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionRate}%` }} />
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">{completionRate}%</span>
            </div>
          </div>

          {/* Ventes stock */}
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-fuchsia-500/5 rounded-full -translate-y-4 translate-x-4" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ventes stock</span>
              <div className="w-8 h-8 bg-fuchsia-500/10 rounded-xl flex items-center justify-center">
                <ShoppingBag size={14} className="text-fuchsia-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{stats.totalSales}</p>
            <p className="text-[10px] text-gray-600 mt-1">{stats.salesRevenue.toLocaleString()}€ encaissés</p>
          </div>
        </div>

        {/* MINI KPI ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Temps moyen", value: `${stats.avgRepairTime}j`, icon: <Clock size={13} className="text-blue-400" />, color: "text-blue-400" },
            { label: "Techniciens", value: stats.activeTechnicians, icon: <Users size={13} className="text-purple-400" />, color: "text-purple-400" },
            { label: "En attente", value: stats.pendingRepairs, icon: <Zap size={13} className="text-amber-400" />, color: "text-amber-400" },
            { label: "Taux complétion", value: `${completionRate}%`, icon: <TrendingUp size={13} className="text-emerald-400" />, color: "text-emerald-400" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#16161d] border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center shrink-0">{kpi.icon}</div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">{kpi.label}</p>
                <p className={`text-base font-black ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CHARTS ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={14} className="text-orange-400" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">Réparations / mois</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.repairsByMonth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                <XAxis dataKey="name" stroke="#374151" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#374151" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="réparations" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#gradRep)" dot={false} activeDot={{ r: 4, fill: "#f97316" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Wallet size={14} className="text-green-400" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">CA / mois</span>
              <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>Total</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fuchsia-500 inline-block"></span>Ventes</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.revenueByMonth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                <XAxis dataKey="name" stroke="#374151" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#374151" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenu" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradRev)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
                <Area type="monotone" dataKey="ventes" stroke="#d946ef" strokeWidth={1.5} fillOpacity={1} fill="url(#gradSales)" dot={false} activeDot={{ r: 4, fill: "#d946ef" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHARTS ROW 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pie statuts */}
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">Par statut</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={stats.repairsByStatus}
                  cx="50%" cy="50%"
                  innerRadius={48} outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ percent }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ""}
                  labelLine={false}
                >
                  {stats.repairsByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-3">
              {stats.repairsByStatus.slice(0, 5).map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-sm shrink-0 border border-white/10" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-300 truncate">{s.name}</span>
                  </div>
                  <span className="text-white font-black ml-2 shrink-0">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar appareils */}
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm">📱</span>
              <span className="text-xs font-bold text-white uppercase tracking-widest">Par appareil</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.repairsByDevice} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" stroke="#374151" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="#374151" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {stats.repairsByDevice.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top techniciens */}
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={14} className="text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">Top techniciens</span>
            </div>
            {stats.topTechnicians.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                <Users size={28} className="mb-2 opacity-30" />
                <p className="text-xs">Aucune donnée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topTechnicians.map((tech, index) => {
                  const pct = Math.round((tech.count / stats.topTechnicians[0].count) * 100);
                  return (
                    <div key={tech.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            index === 0 ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-gray-500"
                          }`}>{index + 1}</span>
                          <span className="text-sm text-white font-medium">{tech.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400">{tech.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: COLORS[index % COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RECENT REPAIRS TABLE */}
        <div className="bg-[#16161d] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-2">
            <Wrench size={14} className="text-orange-400" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Dernières réparations</span>
          </div>
          {stats.recentRepairs.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              <Wrench size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Aucune réparation récente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Ticket</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Client</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest hidden md:table-cell">Appareil</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Statut</th>
                    <th className="text-right py-3 px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentRepairs.map((repair) => (
                    <tr
                      key={repair.id}
                      onClick={() => router.push(`/repairs/${repair.id}`)}
                      className="border-b border-white/5 last:border-0 hover:bg-white/3 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-orange-400">MBX-{repair.id}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-white font-medium">{repair.client}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 hidden md:table-cell">{repair.device}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          repair.status === "✅ Terminé" || repair.status === "📦 Rendu"
                            ? "bg-green-500/15 text-green-400 border border-green-500/20"
                            : repair.status === "🔧 En réparation"
                              ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                              : repair.status === "❌ KO"
                                ? "bg-red-500/15 text-red-400 border border-red-500/20"
                                : "bg-white/5 text-gray-500 border border-white/8"
                        }`}>
                          {repair.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-bold text-white">
                        {repair.price > 0 ? `${repair.price}€` : <span className="text-gray-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
