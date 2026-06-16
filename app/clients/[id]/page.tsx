"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Layout from "../../../components/Layout";
import { StatusBadge } from "../../../lib/status";

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [client, setClient] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger le client
      const { data: clientData } = await supabase.from("clients").select("*").eq("id", id).single();

      setClient(clientData);

      // Charger ses réparations
      const { data: repairsData } = await supabase
        .from("repairs")
        .select("*")
        .eq("client_id", id)
        .order("id", { ascending: false });

      setRepairs(repairsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) => {
    if (isNaN(price) || price === 0) return "0 €";
    return price + " €";
  };

  const getStatusColor = (status) => {
    if (status === "🟢 Terminé") return "bg-green-100 text-green-800";
    if (status === "🔧 En réparation") return "bg-blue-100 text-blue-800";
    if (status === "⚫ Rendu") return "bg-gray-800 text-white";
    return "bg-yellow-100 text-yellow-800";
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">⏳ Chargement...</div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">❌ Client non trouvé</div>
      </Layout>
    );
  }

  const totalAmount = repairs.reduce((sum, r) => sum + (r.final_price || 0), 0);
  const totalPaid = repairs.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
  const remainingAmount = totalAmount - totalPaid;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Bouton retour */}
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition"
        >
          ← Retour
        </button>

        {/* Informations client */}
        <div className="bg-white rounded-2xl shadow-lg border p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">👤 {client.name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Téléphone</p>
              <p className="font-medium">{client.phone !== "NC" ? client.phone : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{client.email !== "NC" ? client.email : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Adresse</p>
              <p className="font-medium">{client.address !== "NC" ? client.address : "-"}</p>
            </div>
          </div>
        </div>

        {/* Statistiques client */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{repairs.length}</div>
            <div className="text-xs text-gray-500">Réparations</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{formatPrice(totalAmount)}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{formatPrice(remainingAmount)}</div>
            <div className="text-xs text-gray-500">Reste à payer</div>
          </div>
        </div>

        {/* Liste des réparations */}
        <div className="bg-white rounded-2xl shadow-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">📱 Historique des réparations</h2>

          {repairs.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Aucune réparation pour ce client</p>
          ) : (
            <div className="space-y-3">
              {repairs.map((repair) => (
                <div
                  key={repair.id}
                  onClick={() => router.push(`/repairs/${repair.id}`)}
                  className="border rounded-xl p-4 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold bg-gray-100 px-2 py-0.5 rounded">
                          MBX-{repair.id}
                        </span>
                        <StatusBadge status={repair.status} size="sm" />
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        📱 {repair.device} • 🔧 {repair.issue}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(repair.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {formatPrice(repair.final_price)}
                      </div>
                      {repair.paid_amount > 0 && (
                        <div className="text-xs text-green-500">
                          Payé: {formatPrice(repair.paid_amount)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
