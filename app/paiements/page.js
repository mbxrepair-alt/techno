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
        .select(`
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
        `)
        .eq("user_id", user.id)
        .neq("paid_amount", 0)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      const rows = (data || []).map(r => {
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
            id: r.clients?.id,
            name: r.clients?.name ?? "Client inconnu",
            email: r.clients?.email ?? "",
            phone: r.clients?.phone ?? "",
            code: r.clients?.client_code ?? ""
          }
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
  const filteredPayments = payments.filter(p => {
    const matchSearch = searchTerm === "" || 
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
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* EN-TÊTE */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2">💰 Détails des encaissements</h1>
          <p className="text-lg text-gray-500">Suivi complet de tous les paiements reçus</p>
        </div>

        {/* STATISTIQUES GLOBALES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-md">
            <div className="text-sm opacity-90 font-medium">Total encaissé</div>
            <div className="text-3xl font-bold mt-1">{totalGlobal.toFixed(2)} €</div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-5 text-white shadow-md">
            <div className="text-sm opacity-90 font-medium">Transactions</div>
            <div className="text-3xl font-bold mt-1">{filteredPayments.length}</div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-md">
            <div className="text-sm opacity-90 font-medium">Clients distincts</div>
            <div className="text-3xl font-bold mt-1">{new Set(filteredPayments.map(p => p.client.id)).size}</div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-md">
            <div className="text-sm opacity-90 font-medium">Montant moyen</div>
            <div className="text-3xl font-bold mt-1">
              {filteredPayments.length > 0 ? (totalGlobal / filteredPayments.length).toFixed(2) : "0"} €
            </div>
          </div>
        </div>

        {/* FILTRES */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">🔍 Filtres</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              placeholder="Rechercher (client, ticket...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
            />
            <select
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}
              className="p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Toutes méthodes</option>
              <option value="Espèces">💰 Espèces</option>
              <option value="CB">💳 Carte Bancaire</option>
              <option value="Virement">🏦 Virement</option>
              <option value="Chèque">📝 Chèque</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Tous statuts</option>
              <option value="payé">✅ Payé</option>
              <option value="partiel">⚠️ Partiel</option>
              <option value="non payé">❌ Non payé</option>
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm"
                placeholder="De"
              />
              <input
                type="date"
                value={dateRange.to}
                onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm"
                placeholder="À"
              />
            </div>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterMethod("all");
                setFilterStatus("all");
                setDateRange({ from: "", to: "" });
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
            >
              🔄 Réinitialiser
            </button>
          </div>
        </div>

        {/* TABLEAU DES PAIEMENTS */}
        <div className="bg-white rounded-xl shadow-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Appareil</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Panne</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Montant</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Méthode</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                      Aucun paiement trouvé
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {p.date ? p.date.toLocaleDateString("fr-FR") : "—"}
                       </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.client.name}</div>
                        {p.client.code && <div className="text-xs text-gray-400 font-mono">{p.client.code}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-orange-600">
                        {p.ticketLabel}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.device}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 italic">{p.issue}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">
                        {p.amount.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {p.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.status === "payé" && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">✅ Payé</span>
                        )}
                        {p.status === "partiel" && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">⚠️ Partiel</span>
                        )}
                        {p.status === "non payé" && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">❌ Non payé</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOUTON RAFRAÎCHIR */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={loadPayments}
            disabled={loading}
            className="px-5 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition shadow-md disabled:opacity-50"
          >
            🔄 Rafraîchir
          </button>
        </div>

        {/* RÉPARTITION PAR MÉTHODE */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-700 mb-3">📊 Répartition par mode de paiement</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(totalByMethod).map(([method, sum]) => (
              <div key={method} className="bg-gray-50 rounded-lg px-4 py-2">
                <span className="text-sm text-gray-500">{method}</span>
                <span className="ml-2 font-bold text-gray-800">{sum.toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}