"use client";

import { useState, useEffect } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { BarChart3 } from "lucide-react";
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
    monthlyRevenue: 0,
    activeTechnicians: 0,
    clientSatisfaction: 98,
    avgRepairTime: 0,
    topTechnicians: [],
    repairsByStatus: [],
    repairsByMonth: [],
    revenueByMonth: [],
    repairsByDevice: [],
    recentRepairs: [],
  });
  const [period, setPeriod] = useState("month");
  const [currentTechnician, setCurrentTechnician] = useState(null);
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
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      let query = supabase.from("repairs").select("*");
      if (!isGerant && currentTechnician) {
        query = query.eq("technician", currentTechnician.name);
      }
      const { data: repairs } = await query;

      const { data: technicians } = await supabase
        .from("technicians")
        .select("*")
        .eq("is_active", true);

      const totalRepairs = repairs?.length || 0;
      const completedRepairs =
        repairs?.filter((r) => r.status === "✅ Terminé" || r.status === "📦 Rendu").length || 0;
      const inProgressRepairs = repairs?.filter((r) => r.status === "🔧 En réparation").length || 0;
      const pendingRepairs =
        repairs?.filter((r) => !r.status || r.status === "📥 Réceptionné").length || 0;
      const totalRevenue = repairs?.reduce((sum, r) => sum + (r.final_price || 0), 0) || 0;

      const statusCounts = {};
      repairs?.forEach((r) => {
        const status = r.status || "📥 Réceptionné";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const repairsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
      }));

      const monthNames = [
        "Jan",
        "Fév",
        "Mar",
        "Avr",
        "Mai",
        "Juin",
        "Juil",
        "Aoû",
        "Sep",
        "Oct",
        "Nov",
        "Déc",
      ];
      const last6Months = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        last6Months.push({
          month: monthNames[d.getMonth()],
          year: d.getFullYear(),
          count: 0,
          revenue: 0,
        });
      }

      repairs?.forEach((r) => {
        const date = new Date(r.created_at);
        const monthKey = monthNames[date.getMonth()];
        const monthData = last6Months.find((m) => m.month === monthKey);
        if (monthData) {
          monthData.count++;
          monthData.revenue += r.final_price || 0;
        }
      });

      const repairsByMonth = last6Months.map((m) => ({ name: m.month, réparations: m.count }));
      const revenueByMonth = last6Months.map((m) => ({ name: m.month, revenu: m.revenue }));

      const techRepairCount: Record<string, number> = {};
      repairs?.forEach((r) => {
        if (r.technician) {
          techRepairCount[r.technician] = (techRepairCount[r.technician] || 0) + 1;
        }
      });
      const topTechnicians = Object.entries(techRepairCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const deviceCounts: Record<string, number> = {};
      repairs?.forEach((r) => {
        const device = r.device || "Autre";
        const deviceKey = device.split(" ")[0];
        deviceCounts[deviceKey] = (deviceCounts[deviceKey] || 0) + 1;
      });
      const repairsByDevice = Object.entries(deviceCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      let totalRepairDays = 0;
      let completedWithDates = 0;
      repairs?.forEach((r) => {
        if (r.end_time && r.created_at) {
          const start = new Date(r.created_at);
          const end = new Date(r.end_time);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          totalRepairDays += days;
          completedWithDates++;
        }
      });
      const avgRepairTime =
        completedWithDates > 0 ? Math.round(totalRepairDays / completedWithDates) : 3;

      const recentRepairs =
        repairs?.slice(0, 5).map((r) => ({
          id: r.id,
          client: r.client_name || "Client",
          device: r.device,
          status: r.status || "📥 Réceptionné",
          price: r.final_price || r.estimated_price || 0,
          date: new Date(r.created_at).toLocaleDateString("fr-FR"),
        })) || [];

      setStats({
        totalRepairs,
        completedRepairs,
        inProgressRepairs,
        pendingRepairs,
        totalRevenue,
        monthlyRevenue: revenueByMonth[revenueByMonth.length - 1]?.revenu || 0,
        activeTechnicians: technicians?.length || 0,
        clientSatisfaction: 98,
        avgRepairTime,
        topTechnicians,
        repairsByStatus,
        repairsByMonth,
        revenueByMonth,
        repairsByDevice,
        recentRepairs,
      });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#06b6d4", "#14b8a6", "#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#eab308"];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-4 text-gray-500 text-sm">Chargement des statistiques...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-cyan-500 to-teal-600 rounded-2xl px-6 py-5">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><BarChart3 size={22} className="text-purple-400" /> Statistiques</h1>
              <p className="text-xs text-white/60 uppercase tracking-widest mt-1">
                {isGerant ? "Vision globale de l'atelier" : `Stats de ${currentTechnician?.name}`}
              </p>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-white/15 border border-white/30 rounded-xl px-3 py-2 text-white text-sm outline-none focus:bg-white/20 focus:border-white/50 transition-all"
            >
              <option value="week">📅 Cette semaine</option>
              <option value="month">📅 Ce mois</option>
              <option value="year">📅 Cette année</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-cyan-500/25">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-cyan-100 text-xs uppercase tracking-wider">Total réparations</p>
                <p className="text-3xl font-black mt-1">{stats.totalRepairs}</p>
              </div>
              <span className="text-3xl">🔧</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg shadow-green-500/25">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-100 text-xs uppercase tracking-wider">Terminées</p>
                <p className="text-3xl font-black mt-1">{stats.completedRepairs}</p>
              </div>
              <span className="text-3xl">✅</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-5 text-white shadow-lg shadow-teal-500/25">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-teal-100 text-xs uppercase tracking-wider">Chiffre d'affaires</p>
                <p className="text-3xl font-black mt-1">{stats.totalRevenue.toLocaleString()}€</p>
              </div>
              <span className="text-3xl">💰</span>
            </div>
          </div>

          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Satisfaction</p>
                <p className="text-3xl font-black mt-1 text-cyan-400">{stats.clientSatisfaction}%</p>
              </div>
              <span className="text-3xl">⭐</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">📈 Évolution des réparations</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.repairsByMonth}>
                <defs>
                  <linearGradient id="colorRepairs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid #ffffff15", borderRadius: "12px", color: "#fff" }} />
                <Area type="monotone" dataKey="réparations" stroke="#06b6d4" fillOpacity={1} fill="url(#colorRepairs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">💰 Évolution du CA</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.revenueByMonth}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid #ffffff15", borderRadius: "12px", color: "#fff" }} formatter={(value) => `${value}€`} />
                <Area type="monotone" dataKey="revenu" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">📊 Réparations par statut</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.repairsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} fill="#8884d8" paddingAngle={2} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "#6b7280" }}>
                  {stats.repairsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid #ffffff15", borderRadius: "12px", color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">🏆 Top techniciens</h3>
            <div className="space-y-3">
              {stats.topTechnicians.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-sm">Aucune donnée disponible</p>
              ) : (
                stats.topTechnicians.map((tech, index) => (
                  <div key={tech.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-400 font-bold text-sm">
                        {index + 1}
                      </div>
                      <p className="font-medium text-white text-sm">{tech.name}</p>
                    </div>
                    <div className="w-32 bg-white/10 rounded-full h-2">
                      <div className="bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full h-2" style={{ width: `${(tech.count / stats.topTechnicians[0]?.count) * 100}%` }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">📱 Réparations par appareil</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.repairsByDevice}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid #ffffff15", borderRadius: "12px", color: "#fff" }} />
                <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">ℹ️ Informations</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-gray-400 text-sm">⏱️ Temps moyen de réparation</span>
                <span className="font-bold text-white">{stats.avgRepairTime} jours</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-gray-400 text-sm">👨‍🔧 Techniciens actifs</span>
                <span className="font-bold text-white">{stats.activeTechnicians}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-gray-400 text-sm">📦 En attente / En cours</span>
                <span className="font-bold text-white">{stats.pendingRepairs + stats.inProgressRepairs}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">⭐ Taux de complétion</span>
                <span className="font-bold text-cyan-400">{Math.round((stats.completedRepairs / stats.totalRepairs) * 100) || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">📋 Dernières réparations</h3>
          {stats.recentRepairs.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">Aucune réparation récente</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-cyan-500/10 border-b border-white/5">
                    <th className="text-left py-3 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Ticket</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Client</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Appareil</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Statut</th>
                    <th className="text-right py-3 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest">Prix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.recentRepairs.map((repair) => (
                    <tr key={repair.id} className="hover:bg-white/5 cursor-pointer transition-colors" onClick={() => router.push(`/repairs/${repair.id}`)}>
                      <td className="py-3 px-4 text-sm font-mono font-bold text-cyan-400">#{repair.id}</td>
                      <td className="py-3 px-4 text-sm text-white">{repair.client}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">{repair.device}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          repair.status === "✅ Terminé" ? "bg-green-500/15 text-green-400"
                          : repair.status === "🔧 En réparation" ? "bg-cyan-500/15 text-cyan-400"
                          : "bg-white/5 text-gray-500"
                        }`}>
                          {repair.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-white">{repair.price}€</td>
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
