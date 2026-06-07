"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function ClientSpace() {
  const router = useRouter();
  const [searchType, setSearchType] = useState("code"); // Changé: "code" par défaut
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError("Veuillez entrer un code client, numéro de ticket ou un email");
      return;
    }

    setLoading(true);
    setError("");

    // RECHERCHE PAR CODE CLIENT (4 chiffres)
    if (searchType === "code" || /^\d{4}$/.test(searchValue)) {
      const codeClient = searchValue.trim();

      const { data: client, error } = await supabase
        .from("clients")
        .select("email, client_code, name")
        .eq("client_code", codeClient)
        .single();

      if (error || !client) {
        setError(`Code client "${codeClient}" non trouvé`);
        setLoading(false);
        return;
      }

      // Rediriger vers la page des tickets avec l'email
      router.push(`/client/tickets?email=${encodeURIComponent(client.email)}`);
      return;
    }

    // RECHERCHE PAR NUMERO DE TICKET
    if (searchType === "ticket") {
      let ticketId = searchValue.trim();
      if (ticketId.toLowerCase().startsWith("mbx-")) {
        ticketId = ticketId.replace(/mbx-/i, "");
      }

      const idNumber = parseInt(ticketId);
      if (isNaN(idNumber)) {
        setError("Numéro de ticket invalide");
        setLoading(false);
        return;
      }

      const { data: ticket, error } = await supabase
        .from("repairs")
        .select("*, clients(*)")
        .eq("id", idNumber)
        .maybeSingle();

      if (error || !ticket) {
        setError(`Ticket non trouvé. Vérifiez le numéro "${searchValue}"`);
        setLoading(false);
        return;
      }

      router.push(`/client/ticket/${ticket.id}`);
      return;
    }

    // RECHERCHE PAR EMAIL
    if (searchType === "email") {
      const { data: tickets, error } = await supabase
        .from("repairs")
        .select("*, clients(*)")
        .eq("clients.email", searchValue.trim());

      if (error || !tickets || tickets.length === 0) {
        setError("Aucun ticket trouvé pour cet email");
        setLoading(false);
        return;
      }

      router.push(`/client/tickets?email=${encodeURIComponent(searchValue)}`);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header simplifié */}
      <div className="bg-white shadow-md px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-blue-600">🔧 MBXrepair</h1>
          <p className="text-gray-500 text-sm">Suivi de réparation client</p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800">Suivi de réparation</h2>
            <p className="text-gray-500 mt-2">
              Entrez votre code client, numéro de ticket ou votre email
            </p>
          </div>

          {/* Type de recherche */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSearchType("code")}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                searchType === "code"
                  ? "bg-green-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              🔐 Code client
            </button>
            <button
              onClick={() => setSearchType("ticket")}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                searchType === "ticket"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              📋 Numéro de ticket
            </button>
            <button
              onClick={() => setSearchType("email")}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                searchType === "email"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              ✉️ Email
            </button>
          </div>

          {/* Champ de recherche */}
          <div className="mb-6">
            <input
              type={searchType === "email" ? "email" : "text"}
              placeholder={
                searchType === "code"
                  ? "Ex: 4728"
                  : searchType === "ticket"
                    ? "Ex: MBX-123 ou 123"
                    : "Votre email"
              }
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-xl text-center">{error}</div>
          )}

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Recherche..." : "🔍 Suivre ma réparation"}
          </button>

          <div className="mt-8 text-center text-sm text-gray-400 border-t pt-6">
            <p>Un ticket vous a été remis lors du dépôt de votre appareil.</p>
            <p className="mt-1">Ou utilisez votre code client pour voir toutes vos réparations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
