// app/client/repairs/[id]/page.js
"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ClientRepairsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [client, setClient] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [clientResponse, setClientResponse] = useState("");
  const [sending, setSending] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    const fetchClientAndTickets = async () => {
      if (!id) {
        setError("ID client invalide");
        setLoading(false);
        return;
      }

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (clientError || !clientData) {
        setError("Client non trouvé");
        setLoading(false);
        return;
      }

      setClient(clientData);

      const { data: repairsData, error: repairsError } = await supabase
        .from("repairs")
        .select("*")
        .eq("client_id", id)
        .order("id", { ascending: false });

      if (repairsError) {
        console.error("Erreur chargement réparations:", repairsError);
      } else {
        setTickets(repairsData || []);
      }

      setLoading(false);
    };

    fetchClientAndTickets();
  }, [id]);

  const getStatusBadge = (status) => {
    const statusColors = {
      "🟡 Réceptionné": "bg-yellow-500",
      "🔬 Diagnostic": "bg-blue-500",
      "✅ Validé client": "bg-green-500",
      "🔧 En réparation": "bg-cyan-500",
      "✅ Terminé": "bg-green-600",
      "📦 Rendu": "bg-gray-500",
      "❌ KO": "bg-red-500",
      "🚫 Refus client": "bg-pink-500"
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full text-white ${statusColors[status] || "bg-gray-500"}`}>
        {status || "🟡 Réceptionné"}
      </span>
    );
  };

  const cleanNotes = (text) => {
    if (!text) return "";
    return text
      .replace(/\[DIAGNOSTIC VALIDÉ\]/gi, "")
      .replace(/Risques: Aucun/gi, "")
      .replace(/Risques : Aucun/gi, "")
      .trim();
  };

  const handleValidate = async (ticket) => {
    if (!clientResponse.trim()) {
      alert("Veuillez écrire un message avant de valider");
      return;
    }
    
    setSending(true);
    const { error } = await supabase
      .from("repairs")
      .update({ 
        client_response: clientResponse,
        client_response_type: "accepte"
      })
      .eq("id", ticket.id);

    if (!error) {
      setTickets(tickets.map(t => 
        t.id === ticket.id 
          ? { ...t, client_response: clientResponse, client_response_type: "accepte" }
          : t
      ));
      setSelectedTicket(null);
      setClientResponse("");
      alert("✅ Votre réponse a été envoyée à l'atelier !");
    } else {
      alert("❌ Erreur lors de l'envoi");
    }
    setSending(false);
  };

  const handleRefuse = async (ticket) => {
    if (!clientResponse.trim()) {
      alert("Veuillez écrire un message avant de refuser");
      return;
    }
    
    setSending(true);
    const { error } = await supabase
      .from("repairs")
      .update({ 
        client_response: clientResponse,
        client_response_type: "refuse"
      })
      .eq("id", ticket.id);

    if (!error) {
      setTickets(tickets.map(t => 
        t.id === ticket.id 
          ? { ...t, client_response: clientResponse, client_response_type: "refuse" }
          : t
      ));
      setSelectedTicket(null);
      setClientResponse("");
      alert("❌ Votre réponse a été envoyée à l'atelier !");
    } else {
      alert("❌ Erreur lors de l'envoi");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos réparations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push("/login")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal Photo Plein écran - EN DEHORS du modal de détail */}
      {showPhotoModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Photo téléphone" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button 
              onClick={() => setShowPhotoModal(false)} 
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl hover:bg-black/70 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-md px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">🔧 MBXrepair</h1>
            <p className="text-gray-500 text-sm">Suivi de réparation client</p>
          </div>
          <button 
            onClick={() => router.push("/login")}
            className="text-gray-500 hover:text-gray-700"
          >
            🔒 Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Infos client */}
        {client && (
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <p className="text-green-100 text-sm">🔑 Code client</p>
                <p className="text-3xl font-mono font-bold">{client.client_code}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm">👤 Nom</p>
                <p className="text-xl font-semibold">{client.name}</p>
              </div>
              {client.phone && client.phone !== "NC" && (
                <div>
                  <p className="text-green-100 text-sm">📞 Téléphone</p>
                  <p className="text-lg">{client.phone}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{tickets.length}</div>
            <div className="text-sm text-gray-500">Total réparations</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {tickets.filter(t => t.status !== "✅ Terminé" && t.status !== "📦 Rendu").length}
            </div>
            <div className="text-sm text-gray-500">En cours</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {tickets.filter(t => t.status === "✅ Terminé" || t.status === "📦 Rendu").length}
            </div>
            <div className="text-sm text-gray-500">Terminées</div>
          </div>
        </div>

        {/* Liste des tickets */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-800">📋 Mes réparations</h2>
            <p className="text-sm text-gray-500">Cliquez sur un ticket pour voir les détails et répondre</p>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500">Aucune réparation trouvée</p>
            </div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="p-4 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-mono text-lg font-bold text-gray-900">
                          🎫 MBX-{ticket.id}
                        </span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">📱 {ticket.device}</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-600">{ticket.issue?.substring(0, 50)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{ticket.estimated_price || ticket.final_price || 0}€</p>
                      <p className="text-xs text-gray-400">
                        {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Détails du ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header Modal */}
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">🔧 Détail réparation</h2>
                <p className="text-sm text-gray-500">MBX-{selectedTicket.id}</p>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Contenu Modal */}
            <div className="p-6 space-y-4">
              {/* Statut */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold">Statut actuel :</span>
                {getStatusBadge(selectedTicket.status)}
              </div>

              {/* Informations appareil */}
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 border-b">
                  <div className="p-3 bg-gray-50 font-semibold">📱 Appareil</div>
                  <div className="p-3">{selectedTicket.device}</div>
                </div>
                <div className="grid grid-cols-2 border-b">
                  <div className="p-3 bg-gray-50 font-semibold">🔧 Panne</div>
                  <div className="p-3">{selectedTicket.issue}</div>
                </div>
                {selectedTicket.imei && selectedTicket.imei !== "NC" && (
                  <div className="grid grid-cols-2 border-b">
                    <div className="p-3 bg-gray-50 font-semibold">🔢 IMEI</div>
                    <div className="p-3 font-mono text-sm">{selectedTicket.imei}</div>
                  </div>
                )}
                {selectedTicket.unlock_code && selectedTicket.unlock_code !== "NC" && (
                  <div className="grid grid-cols-2">
                    <div className="p-3 bg-gray-50 font-semibold">🔑 Code</div>
                    <div className="p-3 font-mono">{selectedTicket.unlock_code}</div>
                  </div>
                )}
              </div>

              {/* Prix */}
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="p-3 bg-gray-50 font-semibold">💰 Prix estimé</div>
                  <div className="p-3 font-bold text-green-600">{selectedTicket.estimated_price || 0}€</div>
                </div>
                {selectedTicket.final_price > 0 && (
                  <div className="grid grid-cols-2 border-t">
                    <div className="p-3 bg-gray-50 font-semibold">💰 Prix final</div>
                    <div className="p-3 font-bold text-blue-600">{selectedTicket.final_price}€</div>
                  </div>
                )}
              </div>

              {/* Diagnostic et Notes (filtrées) */}
              {(selectedTicket.diagnosis || selectedTicket.repair_description || selectedTicket.description) && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-50 font-semibold border-b">🔍 Diagnostic</div>
                  <div className="p-3 text-gray-700 whitespace-pre-wrap">
                    {cleanNotes(selectedTicket.diagnosis) || 
                     cleanNotes(selectedTicket.repair_description) || 
                     cleanNotes(selectedTicket.description) || 
                     "Aucune information"}
                  </div>
                </div>
              )}

              {/* PHOTOS */}
              {selectedTicket.photos && selectedTicket.photos.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-50 font-semibold border-b">📸 Photos de l'appareil</div>
                  <div className="p-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTicket.photos.map((photo, index) => (
                        <div 
                          key={index} 
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition transform hover:scale-105"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhoto(photo);
                            setShowPhotoModal(true);
                          }}
                        >
                          <img 
                            src={photo} 
                            alt={`Photo ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">Cliquez sur une photo pour l'agrandir</p>
                  </div>
                </div>
              )}

              {/* SECTION RÉPONSE CLIENT */}
              {selectedTicket.status !== "✅ Terminé" && selectedTicket.status !== "📦 Rendu" && (
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-blue-800 mb-3">📝 Votre réponse</h3>
                  <textarea
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    placeholder="Écrivez votre message ici... (acceptation, refus, questions, etc.)"
                    value={clientResponse}
                    onChange={(e) => setClientResponse(e.target.value)}
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleValidate(selectedTicket)}
                      disabled={sending}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      ✅ Valider
                    </button>
                    <button
                      onClick={() => handleRefuse(selectedTicket)}
                      disabled={sending}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      ❌ Refuser
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 mt-3 text-center">
                    📱 Merci de nous répondre le plus rapidement possible pour que nous puissions traiter votre dossier.
                  </p>
                </div>
              )}

              {/* Réponse déjà donnée */}
              {selectedTicket.client_response && (
                <div className={`border rounded-lg overflow-hidden ${
                  selectedTicket.client_response_type === "accepte" ? "border-green-300 bg-green-50" : 
                  selectedTicket.client_response_type === "refuse" ? "border-red-300 bg-red-50" : ""
                }`}>
                  <div className="p-3 bg-gray-50 font-semibold border-b">📝 Votre réponse</div>
                  <div className="p-3 text-gray-700 italic whitespace-pre-wrap">
                    {selectedTicket.client_response}
                  </div>
                  {selectedTicket.client_response_type === "accepte" && (
                    <div className="px-3 pb-3 text-green-600 text-sm">✅ Vous avez accepté le diagnostic</div>
                  )}
                  {selectedTicket.client_response_type === "refuse" && (
                    <div className="px-3 pb-3 text-red-600 text-sm">❌ Vous avez refusé le diagnostic</div>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="text-xs text-gray-400 text-center pt-4 border-t">
                <p>Déposé le : {new Date(selectedTicket.created_at).toLocaleString("fr-FR")}</p>
                {selectedTicket.updated_at && (
                  <p>Dernière mise à jour : {new Date(selectedTicket.updated_at).toLocaleString("fr-FR")}</p>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="sticky bottom-0 bg-gray-50 p-4 border-t flex gap-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}