"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

// Composant interne qui utilise useSearchParams
function SuiviClientContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientCodeParam = searchParams.get("code");
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  // État pour la réponse client
  const [clientResponse, setClientResponse] = useState("");
  const [sending, setSending] = useState(false);
  
  // État pour les photos
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (clientCodeParam) {
      loadClientData(clientCodeParam);
    } else {
      setShowCodeInput(true);
      setLoading(false);
    }
  }, [clientCodeParam]);

  const loadClientData = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("client_code", code)
        .single();

      if (clientError || !clientData) {
        setError("Code client invalide. Veuillez vérifier votre code.");
        setShowCodeInput(true);
        setLoading(false);
        return;
      }

      setClient(clientData);

      const { data: ticketsData, error: ticketsError } = await supabase
        .from("repairs")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;

      setTickets(ticketsData || []);
      if (ticketsData?.length > 0) {
        setSelectedTicket(ticketsData[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      router.push(`/suivi-client?code=${manualCode.trim().toUpperCase()}`);
    }
  };

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

  const handleValidate = async () => {
    if (!selectedTicket) return;
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
      .eq("id", selectedTicket.id);

    if (!error) {
      setTickets(tickets.map(t => 
        t.id === selectedTicket.id 
          ? { ...t, client_response: clientResponse, client_response_type: "accepte" }
          : t
      ));
      setSelectedTicket({ ...selectedTicket, client_response: clientResponse, client_response_type: "accepte" });
      setClientResponse("");
      alert("✅ Votre réponse a été envoyée à l'atelier !");
    } else {
      alert("❌ Erreur lors de l'envoi");
    }
    setSending(false);
  };

  const handleRefuse = async () => {
    if (!selectedTicket) return;
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
      .eq("id", selectedTicket.id);

    if (!error) {
      setTickets(tickets.map(t => 
        t.id === selectedTicket.id 
          ? { ...t, client_response: clientResponse, client_response_type: "refuse" }
          : t
      ));
      setSelectedTicket({ ...selectedTicket, client_response: clientResponse, client_response_type: "refuse" });
      setClientResponse("");
      alert("❌ Votre réponse a été envoyée à l'atelier !");
    } else {
      alert("❌ Erreur lors de l'envoi");
    }
    setSending(false);
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Modal photos
  if (showPhotoModal && selectedPhoto) {
    return (
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
    );
  }

  // Affichage de la demande de code client
  if (showCodeInput && !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
              <span className="text-3xl">🔍</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Suivi de réparation</h1>
            <p className="text-gray-500 mb-6">
              Entrez votre code client pour suivre l'avancement de votre réparation
            </p>
            
            <div className="bg-orange-50 p-4 rounded-xl mb-6 border border-orange-100">
              <p className="text-sm text-orange-700">
                💡 <strong>Où trouver mon code client ?</strong><br />
                Votre code client vous a été envoyé par email lors du dépôt de votre appareil.
              </p>
            </div>
            
            <form onSubmit={handleManualSubmit}>
              <input
                type="text"
                placeholder="Ex: DOM923167"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono text-center text-lg"
                autoFocus
              />
              <button
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition shadow-md"
              >
                🔍 Suivre ma réparation
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Chargement de vos informations...</p>
        </div>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Code invalide</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push("/")} 
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-xl hover:from-orange-600 hover:to-orange-700 transition"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push("/")}>
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">M</span>
              </div>
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-gray-800">MBX</span>
              <span className="text-orange-500 font-light text-xs block -mt-1">Réparations</span>
            </div>
          </div>
          <div className="bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
            <span className="text-sm font-mono text-orange-600">Code: {client?.client_code}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Infos client */}
        {client && (
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <p className="text-orange-100 text-sm">🔑 Code client</p>
                <p className="text-3xl font-mono font-bold">{client.client_code}</p>
              </div>
              <div>
                <p className="text-orange-100 text-sm">👤 Nom</p>
                <p className="text-xl font-semibold">{client.name}</p>
              </div>
              {client.phone && client.phone !== "NC" && (
                <div>
                  <p className="text-orange-100 text-sm">📞 Téléphone</p>
                  <p className="text-lg">{client.phone}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{tickets.length}</div>
            <div className="text-sm text-gray-500">Total réparations</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {tickets.filter(t => t.status !== "✅ Terminé" && t.status !== "📦 Rendu").length}
            </div>
            <div className="text-sm text-gray-500">En cours</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {tickets.filter(t => t.status === "✅ Terminé" || t.status === "📦 Rendu").length}
            </div>
            <div className="text-sm text-gray-500">Terminées</div>
          </div>
        </div>

        {/* Liste des tickets et détail */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Liste des tickets */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">📋 Mes réparations</h2>
              <p className="text-sm text-gray-500">Cliquez sur un ticket pour voir les détails</p>
            </div>

            {tickets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500">Aucune réparation trouvée</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {tickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition ${selectedTicket?.id === ticket.id ? 'bg-orange-50' : ''}`}
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
                          {formatDate(ticket.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Détail du ticket sélectionné */}
          <div>
            {selectedTicket ? (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        Ticket MBX-{selectedTicket.id}
                      </h2>
                      <p className="text-gray-500 text-sm mt-1">
                        Créé le {formatDate(selectedTicket.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>

                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {/* Infos appareil */}
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
                  </div>

                  {/* Prix */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2">
                      <div className="p-3 bg-gray-50 font-semibold">💰 Prix estimé</div>
                      <div className="p-3 font-bold text-orange-600">{selectedTicket.estimated_price || 0}€</div>
                    </div>
                    {selectedTicket.final_price > 0 && (
                      <div className="grid grid-cols-2 border-t">
                        <div className="p-3 bg-gray-50 font-semibold">💰 Prix final</div>
                        <div className="p-3 font-bold text-green-600">{selectedTicket.final_price}€</div>
                      </div>
                    )}
                  </div>

                  {/* Diagnostic */}
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
                    <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                      <h3 className="font-semibold text-orange-800 mb-3">📝 Votre réponse</h3>
                      <textarea
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
                        rows="4"
                        placeholder="Écrivez votre message ici... (acceptation, refus, questions, etc.)"
                        value={clientResponse}
                        onChange={(e) => setClientResponse(e.target.value)}
                      />
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={handleValidate}
                          disabled={sending}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                          ✅ Valider
                        </button>
                        <button
                          onClick={handleRefuse}
                          disabled={sending}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                        >
                          ❌ Refuser
                        </button>
                      </div>
                      <p className="text-xs text-orange-600 mt-3 text-center">
                        📱 Merci de nous répondre le plus rapidement possible
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
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📭</div>
                <p className="text-gray-500 text-lg">Sélectionnez un ticket pour voir les détails</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} MBX Réparations - Tous droits réservés</p>
          <p className="text-sm text-gray-500 mt-2">Suivi de réparation en temps réel avec votre code client unique</p>
        </div>
      </footer>
    </div>
  );
}

// Page principale avec Suspense - C'EST LE PLUS IMPORTANT !
export default function SuiviClientPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    }>
      <SuiviClientContent />
    </Suspense>
  );
}