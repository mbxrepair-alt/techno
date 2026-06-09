"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";

export default function PaiementsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Récupérer toutes les réparations qui ont un paiement
      const { data, error } = await supabase
        .from("repairs")
        .select(
          `
          id,
          device,
          issue,
          paid_amount,
          payment_status,
          payment_method,
          payment_date,
          final_price,
          estimated_price,
          tva_rate,
          clients (id, name, email, phone, client_code)
        `
        )
        .eq("user_id", user.id)
        .neq("paid_amount", 0)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      const rows = (data || []).map((r) => {
        const priceHt = r.final_price || r.estimated_price || 0;
        const tvaRate = r.tva_rate || 0;
        const totalTtc = tvaRate === 0 ? priceHt : priceHt * (1 + tvaRate / 100);

        return {
          id: r.id,
          ticketLabel: `MBX-${r.id}`,
          device: r.device || "Appareil non spécifié",
          issue: r.issue || "Panne non spécifiée",
          amount: Number(r.paid_amount) || 0,
          totalTtc: totalTtc,
          status: r.payment_status || "non payé",
          method: r.payment_method || "Inconnu",
          date: r.payment_date ? new Date(r.payment_date) : null,
          client: {
            id: (r.clients as any)?.id,
            name: (r.clients as any)?.name ?? "Client inconnu",
            email: (r.clients as any)?.email ?? "",
            phone: (r.clients as any)?.phone ?? "",
            code: (r.clients as any)?.client_code ?? "",
          },
        };
      });

      setPayments(rows);
    } catch (e) {
      console.error("Erreur chargement paiements:", e);
      alert("❌ Impossible de récupérer les paiements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Filtres
  const filteredPayments = payments.filter((p) => {
    const matchSearch =
      searchTerm === "" ||
      p.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ticketLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.device.toLowerCase().includes(searchTerm.toLowerCase());

    const matchMethod = filterMethod === "all" || p.method === filterMethod;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;

    let matchDate = true;
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      matchDate = matchDate && p.date && p.date >= fromDate;
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59);
      matchDate = matchDate && p.date && p.date <= toDate;
    }

    return matchSearch && matchMethod && matchStatus && matchDate;
  });

  const totalGlobal = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalByMethod = filteredPayments.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] ?? 0) + p.amount;
    return acc;
  }, {});

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl px-6 py-5 mb-6">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative">
            <h1 className="text-2xl font-black text-white tracking-tight">💳 Encaissements</h1>
            <p className="text-xs text-white/60 uppercase tracking-widest mt-1">Suivi complet des paiements reçus</p>
          </div>
        </div>

        {/* STATISTIQUES GLOBALES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg shadow-pink-500/25">
            <div className="text-xs font-medium text-white/70 uppercase tracking-wider">Total encaissé</div>
            <div className="text-3xl font-black mt-1">{totalGlobal.toFixed(2)} €</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg shadow-green-500/25">
            <div className="text-xs font-medium text-white/70 uppercase tracking-wider">Transactions</div>
            <div className="text-3xl font-black mt-1">{filteredPayments.length}</div>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg shadow-rose-500/25">
            <div className="text-xs font-medium text-white/70 uppercase tracking-wider">Clients distincts</div>
            <div className="text-3xl font-black mt-1">{new Set(filteredPayments.map((p) => p.client.id)).size}</div>
          </div>
          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Montant moyen</div>
            <div className="text-3xl font-black mt-1 text-pink-400">
              {filteredPayments.length > 0 ? (totalGlobal / filteredPayments.length).toFixed(2) : "0"} €
            </div>
          </div>
        </div>

        {/* FILTRES */}
        <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5 mb-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">🔍 Filtres</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              placeholder="Rechercher (client, ticket...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/15 transition-all"
            />
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
              className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/15 transition-all">
              <option value="all">Toutes méthodes</option>
              <option value="Espèces">💰 Espèces</option>
              <option value="CB">💳 Carte Bancaire</option>
              <option value="Virement">🏦 Virement</option>
              <option value="Chèque">📝 Chèque</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/15 transition-all">
              <option value="all">Tous statuts</option>
              <option value="payé">✅ Payé</option>
              <option value="partiel">⚠️ Partiel</option>
              <option value="non payé">❌ Non payé</option>
            </select>
            <div className="flex gap-2">
              <input type="date" value={dateRange.from}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/60 transition-all" />
              <input type="date" value={dateRange.to}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/60 transition-all" />
            </div>
            <button
              onClick={() => { setSearchTerm(""); setFilterMethod("all"); setFilterStatus("all"); setDateRange({ from: "", to: "" }); }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm border border-white/10 transition-all"
            >
              🔄 Réinitialiser
            </button>
          </div>
        </div>

        {/* TABLEAU DES PAIEMENTS */}
        <div className="bg-[#16161d] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-pink-500/10 border-b border-white/5">
                  <th className="px-4 py-3 text-left text-xs font-bold text-pink-400 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-pink-400 uppercase tracking-widest">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-pink-400 uppercase tracking-widest">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-pink-400 uppercase tracking-widest">Appareil</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-pink-400 uppercase tracking-widest">Panne</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-pink-400 uppercase tracking-widest">Montant</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-pink-400 uppercase tracking-widest">Méthode</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-pink-400 uppercase tracking-widest">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">Aucun paiement trouvé</td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400">{p.date ? p.date.toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white text-sm">{p.client.name}</div>
                        {p.client.code && <div className="text-xs text-gray-500 font-mono">{p.client.code}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-pink-400">{p.ticketLabel}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{p.device}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 italic">{p.issue}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-400">{p.amount.toFixed(2)} €</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-pink-500/10 text-pink-400 rounded-full text-xs">{p.method}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.status === "payé" && <span className="px-2 py-1 bg-green-500/15 text-green-400 rounded-full text-xs">✅ Payé</span>}
                        {p.status === "partiel" && <span className="px-2 py-1 bg-amber-500/15 text-amber-400 rounded-full text-xs">⚠️ Partiel</span>}
                        {p.status === "non payé" && <span className="px-2 py-1 bg-white/5 text-gray-500 rounded-full text-xs">❌ Non payé</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOUTON RAFRAÎCHIR */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={loadPayments}
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl text-sm font-semibold shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            🔄 Rafraîchir
          </button>
        </div>

        {/* RÉPARTITION PAR MÉTHODE */}
        <div className="mt-5 bg-[#16161d] border border-white/5 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">📊 Répartition par mode de paiement</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(totalByMethod).map(([method, sum]) => (
              <div key={method} className="bg-pink-500/10 border border-pink-500/20 rounded-xl px-4 py-2">
                <span className="text-sm text-gray-400">{method}</span>
                <span className="ml-2 font-bold text-pink-400">{(sum as number).toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
