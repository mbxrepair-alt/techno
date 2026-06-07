"use client";

import { useState, useEffect } from "react";
import { supabase, getCurrentUser } from "../../../lib/supabase";
import Link from "next/link";

export default function ClientSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserEmail(user.email || "Email inconnu");

      // Récupérer le vrai ID du profil depuis la table profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", user.email)
        .single();

      const profileId = profile?.id || user.id;

      console.log("Email connecté:", user.email);
      console.log("ID profil utilisé pour filtre:", profileId);

      const { data, error } = await supabase
        .from("repairs")
        .select(
          `
          *,
          clients (name, client_code, phone, email)
        `
        )
        .eq("is_client_submitted", true)
        .eq("user_id", profileId)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Erreur fetch:", error);
      } else {
        console.log("Soumissions trouvées:", data?.length);
        setSubmissions(data || []);
      }
    } catch (err) {
      console.error("Erreur générale:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      "🟡 Réceptionné": "bg-yellow-500",
      "🔬 Diagnostic": "bg-blue-500",
      "✅ Validé client": "bg-green-500",
      "🔧 En réparation": "bg-cyan-500",
      "✅ Terminé": "bg-green-600",
      "📦 Rendu": "bg-gray-500",
      "❌ KO": "bg-red-500",
      "🚫 Refus client": "bg-pink-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              📱 Appareils saisis par les clients
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Connecté : <strong>{currentUserEmail}</strong>
            </p>
          </div>
          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
            {submissions.length} appareil(s)
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Appareil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Panne
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Soumis le
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">
                      #{sub.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">
                        {sub.clients?.name || "Inconnu"}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {sub.clients?.client_code}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{sub.device}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {sub.issue}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full text-white ${getStatusBadge(sub.status)}`}
                      >
                        {sub.status || "🟡 Réceptionné"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(sub.submitted_at || sub.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/repairs/${sub.id}`}
                        className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1"
                      >
                        Voir détails →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {submissions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 text-lg">Aucun appareil saisi par vos clients</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
