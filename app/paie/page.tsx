"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { Banknote } from "lucide-react";

export default function PaiePage() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [techs, setTechs] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const [techRes, repRes] = await Promise.all([
        supabase.from("technicians").select("*").eq("company_id", user.id).order("name", { ascending: true }),
        supabase
          .from("repairs")
          .select("technician, final_price, status, created_at")
          .eq("user_id", user.id)
          .in("status", ["✅ Terminé", "📦 Rendu"]),
      ]);
      setTechs(techRes.data || []);
      setRepairs(repRes.data || []);
    } catch (e) {
      console.error("paie load:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthRepairs = repairs.filter((r) => String(r.created_at || "").slice(0, 7) === month);

  const statsFor = (name: string) => {
    const list = monthRepairs.filter((r) => r.technician === name);
    const ca = list.reduce((s, r) => s + (Number(r.final_price) || 0), 0);
    return { count: list.length, ca };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = (id: number, field: string, value: number) => {
    setTechs((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const saveField = async (id: number, field: string, value: number) => {
    try {
      await supabase.from("technicians").update({ [field]: value }).eq("id", id);
    } catch (e) {
      console.error("save paie:", e);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salaire = (t: any, ca: number) => {
    const base = Number(t.base_salaire) || 0;
    const rate = Number(t.commission_rate) || 0;
    return base + (ca * rate) / 100;
  };

  const totals = techs.reduce(
    (acc, t) => {
      const { count, ca } = statsFor(t.name);
      acc.count += count;
      acc.ca += ca;
      acc.salaires += salaire(t, ca);
      return acc;
    },
    { count: 0, ca: 0, salaires: 0 }
  );

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Banknote size={18} className="text-green-400" />
              Paie des techniciens
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Salaire de base + commission sur le CA généré</p>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
          />
        </div>

        {/* Totaux */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Réparations</div>
            <div className="text-2xl font-black text-white mt-1">{totals.count}</div>
          </div>
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">CA généré</div>
            <div className="text-2xl font-black text-orange-400 mt-1">{totals.ca.toFixed(0)} €</div>
          </div>
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Total salaires</div>
            <div className="text-2xl font-black text-green-400 mt-1">{totals.salaires.toFixed(0)} €</div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500" />
          </div>
        ) : techs.length === 0 ? (
          <div className="text-center text-gray-600 py-16 bg-[#16161d] border border-white/5 rounded-2xl text-sm">
            Aucun technicien. Ajoutez-en dans Réglages → Techniciens.
          </div>
        ) : (
          <div className="space-y-3">
            {techs.map((t) => {
              const { count, ca } = statsFor(t.name);
              return (
                <div key={t.id} className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 font-black text-sm">
                        {t.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{t.name}{t.is_gerant ? " · Gérant" : ""}</div>
                        <div className="text-xs text-gray-500">{count} réparation(s) · CA {ca.toFixed(0)} €</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Salaire</div>
                      <div className="text-xl font-black text-green-400">{salaire(t, ca).toFixed(2)} €</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-3 border-t border-white/5">
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      Base fixe (€)
                      <input
                        type="number"
                        value={t.base_salaire ?? 0}
                        onChange={(e) => updateField(t.id, "base_salaire", Number(e.target.value))}
                        onBlur={(e) => saveField(t.id, "base_salaire", Number(e.target.value))}
                        className="w-24 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-sm text-right outline-none focus:border-green-500/50"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      Commission (%)
                      <input
                        type="number"
                        value={t.commission_rate ?? 0}
                        onChange={(e) => updateField(t.id, "commission_rate", Number(e.target.value))}
                        onBlur={(e) => saveField(t.id, "commission_rate", Number(e.target.value))}
                        className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-sm text-right outline-none focus:border-green-500/50"
                      />
                    </label>
                    <span className="text-xs text-gray-500 flex items-center">
                      = {(Number(t.base_salaire) || 0).toFixed(0)} € + {ca.toFixed(0)} € × {(Number(t.commission_rate) || 0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-600 mt-4">
          ⚠️ Si les champs Base / Commission ne s&apos;enregistrent pas, exécutez le fichier <code className="text-gray-400">supabase-payroll.sql</code> dans Supabase (ajoute les colonnes).
        </p>
      </div>
    </Layout>
  );
}
