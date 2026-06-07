"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Layout from "../../../components/Layout";

export default function TicketsContent(): JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("id");

  const [tickets, setTickets] = useState([]);
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (clientId) {
      loadTickets();
    } else {
      setError("ID client requis");
      setLoading(false);
    }
  }, [clientId]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", parseInt(clientId))
        .single();

      if (clientError || !clientData) {
        setError("Client non trouvé");
        setLoading(false);
        return;
      }

      setClientInfo(clientData);

      const { data: repairsData, error: repairsError } = await supabase
        .from("repairs")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });

      if (repairsError) throw repairsError;

      setTickets(repairsData || []);
    } catch (err) {
      console.error(err);
      setError("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      "✅ Terminé": "bg-green-100 text-green-800",
      "🔧 En réparation": "bg-blue-100 text-blue-800",
      "✅ Validé client": "bg-purple-100 text-purple-800",
      "🔬 Diagnostic": "bg-yellow-100 text-yellow-800",
      "📦 Rendu": "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-red-600 font-semibold">❌ {error}</p>
          <button onClick={() => router.push("/")} className="mt-4 text-blue-600 hover:underline">
            ← Retour à l'accueil
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">📋 Mes tickets</h1>
        <p className="text-gray-500 mb-6">Bonjour {clientInfo?.name}</p>

        {tickets.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <p className="text-gray-500">Aucun ticket trouvé</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => router.push(`/client/ticket?id=${ticket.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-gray-800">MBX-{ticket.id}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status || "🟡 Réceptionné"}
                      </span>
                    </div>
                    <p className="text-gray-600">📱 {ticket.device}</p>
                    <p className="text-sm text-gray-500">🔧 {ticket.issue}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{ticket.final_price || 0} €</p>
                    <p className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
