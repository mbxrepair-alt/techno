"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";

export default function StatistiquesPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalRepairs: 0,
    totalClients: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    completedRepairs: 0,
    inProgressRepairs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Nombre total de réparations
      const { count: totalRepairs } = await supabase
        .from("repairs")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id);

      // Nombre de clients
      const { count: totalClients } = await supabase
        .from("clients")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id);

      // Chiffre d'affaires total
      const { data: repairsData } = await supabase
        .from("repairs")
        .select("paid_amount")
        .eq("user_id", user.id);

      const totalRevenue = (repairsData || []).reduce((sum, r) => sum + (r.paid_amount || 0), 0);

      // Réparations par statut
      const { count: completedRepairs } = await supabase
        .from("repairs")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("status", "✅ Terminé");

      const { count: inProgressRepairs } = await supabase
        .from("repairs")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("status", "🔧 En réparation");

      // Paiements en attente
      const { data: unpaidRepairs } = await supabase
        .from("repairs")
        .select("final_price, paid_amount")
        .eq("user_id", user.id)
        .eq("status", "✅ Terminé");

      const pendingPayments = (unpaidRepairs || []).reduce((sum, r) => {
        const remaining = (r.final_price || 0) - (r.paid_amount || 0);
        return sum + (remaining > 0 ? remaining : 0);
      }, 0);

      setStats({
        totalRepairs: totalRepairs || 0,
        totalClients: totalClients || 0,
        totalRevenue,
        pendingPayments,
        completedRepairs: completedRepairs || 0,
        inProgressRepairs: inProgressRepairs || 0
      });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-2">📈 Statistiques</h1>
        <p className="text-lg text-gray-500 mb-8">Chiffres clés de votre activité</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="text-sm opacity-90">Total réparations</div>
            <div className="text-4xl font-bold mt-2">{stats.totalRepairs}</div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="text-sm opacity-90">Chiffre d'affaires</div>
            <div className="text-4xl font-bold mt-2">{stats.totalRevenue.toFixed(2)} €</div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="text-sm opacity-90">Clients</div>
            <div className="text-4xl font-bold mt-2">{stats.totalClients}</div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="text-sm opacity-90">Réparations terminées</div>
            <div className="text-4xl font-bold mt-2">{stats.completedRepairs}</div>
          </div>
          <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl p-6 text-white">
            <div className="text-sm opacity-90">En cours</div>
            <div className="text-4xl font-bold mt-2">{stats.inProgressRepairs}</div>
          </div>
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
            <div className="text-sm opacity-90">Paiements en attente</div>
            <div className="text-4xl font-bold mt-2">{stats.pendingPayments.toFixed(2)} €</div>
          </div>
        </div>

        <div className="mt-8 text-right">
          <button onClick={loadStats} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            🔄 Actualiser
          </button>
        </div>
      </div>
    </Layout>
  );
}