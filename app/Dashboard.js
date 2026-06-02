"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0 });

  useEffect(() => {
    const checkUser = async () => {
      // Vérifier l'utilisateur normal
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      loadAdminStats();
      setLoading(false);
    };
    checkUser();
  }, []);

  const loadAdminStats = async () => {
    try {
      const user = await getCurrentUser();
      const { data } = await supabase
        .from("repairs")
        .select("*")
        .eq("user_id", user?.id);
      
      setStats({
        total: data?.length || 0,
        inProgress: data?.filter(r => r.status === "🔧 En réparation").length || 0,
        completed: data?.filter(r => r.status === "✅ Terminé").length || 0
      });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">📊 Dashboard</h1>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-500 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div>Réparations</div>
          </div>
          <div className="bg-orange-500 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">{stats.inProgress}</div>
            <div>En cours</div>
          </div>
          <div className="bg-green-500 text-white p-6 rounded-xl text-center">
            <div className="text-3xl font-bold">{stats.completed}</div>
            <div>Terminées</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}