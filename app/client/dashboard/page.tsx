// app/client/dashboard/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientDashboard() {
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("clientToken");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      const token = localStorage.getItem("clientToken");
      const res = await fetch("/api/client/my-repairs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
        setTickets(data.tickets);
      } else if (res.status === 401) {
        localStorage.removeItem("clientToken");
        localStorage.removeItem("clientCode");
        localStorage.removeItem("clientId");
        router.push("/login");
      } else {
        setError("Erreur lors du chargement des données");
      }
    } catch (error) {
      console.error("Erreur:", error);
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      en_attente: { label: "En attente", color: "bg-yellow-500" },
      en_cours: { label: "En cours", color: "bg-blue-500" },
      termine: { label: "Terminé", color: "bg-green-500" },
      livre: { label: "Livré", color: "bg-purple-500" },
    };
    const s = statusMap[status] || { label: status, color: "bg-gray-500" };
    return (
      <span className={`px-2 py-1 text-xs rounded-full text-white ${s.color}`}>
        {s.label}
      </span>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientCode");
    localStorage.removeItem("clientId");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔧 Mon espace client</h1>
            <p className="text-sm text-gray-500">Suivi de mes réparations</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Infos client */}
        {client && (
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 mb-8 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-green-100 text-sm">Code client</p>
                <p className="text-2xl font-mono font-bold">{client.code}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm">Nom</p>
                <p className="text-xl font-semibold">{client.name}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm">Email</p>
                <p className="text-lg">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <p className="text-green-100 text-sm">Téléphone</p>
                  <p className="text-lg">{client.phone}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{tickets.length}</div>
            <div className="text-sm text-gray-500">Total réparations</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {tickets.filter(t => t.status === "en_attente").length}
            </div>
            <div className="text-sm text-gray-500">En attente</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {tickets.filter(t => t.status === "en_cours").length}
            </div>
            <div className="text-sm text-gray-500">En cours</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {tickets.filter(t => t.status === "termine" || t.status === "livre").length}
            </div>
            <div className="text-sm text-gray-500">Terminées</div>
          </div>
        </div>

        {/* Liste des tickets */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold">📋 Mes réparations</h2>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune réparation trouvée</p>
            </div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-lg font-bold">
                          🎫 {ticket.code}
                        </span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-gray-600">
                        <span className="font-medium">Problème:</span> {ticket.problem}
                      </p>
                      {ticket.description && (
                        <p className="text-gray-500 text-sm mt-1">
                          {ticket.description}
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-2">
                        Déposé le {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{ticket.amount}€</p>
                      {ticket.status === "termine" && (
                        <p className="text-green-600 text-sm font-medium mt-1">✅ Prêt à récupérer</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
