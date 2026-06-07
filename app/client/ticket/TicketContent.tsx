"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Layout from "../../../components/Layout";

export default function TicketContent(): JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticketId = searchParams.get("id");

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    } else {
      setError("ID ticket requis");
      setLoading(false);
    }
  }, [ticketId]);

  const loadTicket = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("repairs")
        .select("*, clients(*)")
        .eq("id", parseInt(ticketId))
        .single();

      if (error || !data) {
        setError("Ticket non trouvé");
        setLoading(false);
        return;
      }

      setTicket(data);
      setStatus(data.status || "🟡 Réceptionné");
    } catch (err) {
      console.error(err);
      setError("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("repairs")
        .update({ status: newStatus })
        .eq("id", parseInt(ticketId));

      if (error) throw error;

      setStatus(newStatus);
      setTicket({ ...ticket, status: newStatus });
      alert("Statut mis à jour !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour");
    } finally {
      setIsUpdating(false);
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

  const getStatusIcon = (status) => {
    const icons = {
      "✅ Terminé": "✅",
      "🔧 En réparation": "🔧",
      "✅ Validé client": "✅",
      "🔬 Diagnostic": "🔬",
      "📦 Rendu": "📦"
    };
    return icons[status] || "🟡";
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
      <div className="max-w-2xl mx-auto p-4">
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          ← Retour
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {getStatusIcon(status)} Ticket #{ticket.id}
              </h1>
              <p className="text-gray-500 mt-1">
                Créé le {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-sm text-gray-500">
                Client : {ticket.clients?.name}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
              {status}
            </div>
          </div>

          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div>
              <label className="text-sm text-gray-500">Appareil</label>
              <p className="font-medium text-gray-800">{ticket.device}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Problème</label>
              <p className="font-medium text-gray-800">{ticket.issue}</p>
            </div>
            {ticket.observations && (
              <div>
                <label className="text-sm text-gray-500">Observations</label>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{ticket.observations}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500">Prix</label>
              <p className="text-xl font-bold text-blue-600">{ticket.final_price || 0} €</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <label className="text-sm text-gray-500 block mb-2">Mettre à jour le statut</label>
            <div className="flex gap-2 flex-wrap">
              {["🔬 Diagnostic", "🔧 En réparation", "✅ Validé client", "✅ Terminé", "📦 Rendu"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusUpdate(s)}
                  disabled={isUpdating}
                  className={`px-3 py-1 rounded-full text-sm transition ${status === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
