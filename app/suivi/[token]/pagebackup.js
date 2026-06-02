"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Layout from "../../../components/Layout";

export default function SuiviPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token;
  
  const [loading, setLoading] = useState(true);
  const [repair, setRepair] = useState(null);
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);
  const [clientComment, setClientComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationAction, setValidationAction] = useState(null);

  useEffect(() => {
    if (token) {
      loadTrackingInfo();
    }
  }, [token]);

  const loadTrackingInfo = async () => {
    setLoading(true);
    try {
      // Récupérer le lien de suivi
      const { data: tracking, error: trackingError } = await supabase
        .from("tracking_links")
        .select("*")
        .eq("access_token", token)
        .eq("is_active", true)
        .single();

      if (trackingError || !tracking) {
        setError("Lien de suivi invalide");
        setLoading(false);
        return;
      }

      if (new Date(tracking.expires_at) < new Date()) {
        setError("Ce lien de suivi a expiré (valable 30 jours)");
        setLoading(false);
        return;
      }

      // Mettre à jour le compteur de vues
      await supabase
        .from("tracking_links")
        .update({ 
          view_count: (tracking.view_count || 0) + 1,
          last_view: new Date().toISOString()
        })
        .eq("id", tracking.id);

      // Récupérer la réparation et le client
      const { data: repairData, error: repairError } = await supabase
        .from("repairs")
        .select("*, clients(*)")
        .eq("id", tracking.repair_id)
        .single();

      if (repairError) throw repairError;

      setRepair(repairData);
      setClient(repairData.clients);
      
      // Charger le commentaire client existant
      if (repairData.client_comment) {
        setClientComment(repairData.client_comment);
      }

    } catch (err) {
      console.error("Erreur:", err);
      setError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const submitClientValidation = async (action) => {
    if (!repair) return;
    
    setIsSubmitting(true);
    setValidationAction(action);
    
    try {
      const updates = {
        client_validated: action === "accept",
        client_rejected: action === "reject",
        client_comment: clientComment,
        client_response_date: new Date().toISOString()
      };
      
      if (action === "accept") {
        updates.status = "✅ Validé client";
      }
      
      const { error: updateError } = await supabase
        .from("repairs")
        .update(updates)
        .eq("id", repair.id);
      
      if (updateError) throw updateError;
      
      setRepair(prev => ({ ...prev, ...updates }));
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        loadTrackingInfo();
      }, 2000);
      
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors de l'envoi de votre réponse");
    } finally {
      setIsSubmitting(false);
      setValidationAction(null);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      "🟡 Réceptionné": { label: "Réceptionné", color: "bg-yellow-100 text-yellow-800", icon: "📥", step: 1 },
      "🔬 Diagnostic": { label: "Diagnostic", color: "bg-blue-100 text-blue-800", icon: "🔬", step: 2 },
      "✅ Validé client": { label: "Validé client", color: "bg-green-100 text-green-800", icon: "✅", step: 3 },
      "🔧 En réparation": { label: "En réparation", color: "bg-orange-100 text-orange-800", icon: "🔧", step: 4 },
      "✅ Terminé": { label: "Terminé", color: "bg-purple-100 text-purple-800", icon: "✅", step: 5 },
      "📦 Rendu": { label: "Rendu", color: "bg-gray-100 text-gray-800", icon: "📦", step: 6 },
      "❌ KO": { label: "Non réparable", color: "bg-red-100 text-red-800", icon: "❌", step: 99 },
      "🚫 Refus client": { label: "Refus client", color: "bg-pink-100 text-pink-800", icon: "🚫", step: 98 }
    };
    return statusMap[status] || { label: status || "En cours", color: "bg-gray-100", icon: "📋", step: 0 };
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "Date inconnue";
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Date inconnue";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement de votre suivi...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Lien invalide</h1>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-400 mt-4">Contactez votre réparateur pour obtenir un nouveau lien</p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const statusInfo = getStatusInfo(repair?.status);
  const canValidate = repair?.status === "🔬 Diagnostic" && !repair?.client_validated && !repair?.client_rejected;
  const isAlreadyValidated = repair?.client_validated === true;
  const isRejected = repair?.client_rejected === true;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Message de succès */}
          {showSuccess && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded-lg text-green-700 text-center animate-fade-in">
              ✅ Votre réponse a bien été enregistrée. Merci !
            </div>
          )}
          
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔧</div>
            <h1 className="text-2xl font-bold text-gray-800">Suivi de réparation</h1>
            <p className="text-gray-500 text-sm mt-1">Bonjour {client?.name}</p>
          </div>

          {/* Carte principale */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Bannière */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <p className="text-sm opacity-80">Ticket n°</p>
                  <p className="text-2xl font-bold">MBX-{repair?.id}</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
                  {statusInfo.icon} {statusInfo.label}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-700 mb-4">📊 Avancement</h3>
              <div className="relative">
                <div className="flex justify-between">
                  {[
                    { label: "Réception", icon: "📥", step: 1 },
                    { label: "Diagnostic", icon: "🔬", step: 2 },
                    { label: "Validation", icon: "✅", step: 3 },
                    { label: "Réparation", icon: "🔧", step: 4 },
                    { label: "Terminé", icon: "✅", step: 5 },
                    { label: "Rendu", icon: "📦", step: 6 }
                  ].map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        statusInfo.step >= step.step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {step.icon}
                      </div>
                      <span className={`text-xs mt-2 text-center hidden sm:block ${
                        statusInfo.step >= step.step ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
                  <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(statusInfo.step / 6) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Diagnostic */}
            {repair?.diagnosis && (
              <div className="p-6 border-b">
                <h3 className="font-semibold text-gray-700 mb-3">🔍 Diagnostic</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{repair.diagnosis}</p>
                  {repair?.risks && (
                    <p className="text-sm mt-2 text-orange-600">⚠️ {repair.risks}</p>
                  )}
                </div>
              </div>
            )}

            {/* Réparation effectuée */}
            {repair?.repair_description && (
              <div className="p-6 border-b">
                <h3 className="font-semibold text-gray-700 mb-3">🔧 Réparation effectuée</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{repair.repair_description}</p>
                </div>
              </div>
            )}

            {/* Section validation client */}
            {canValidate && (
              <div className="p-6 border-b bg-yellow-50">
                <h3 className="font-semibold text-gray-700 mb-3">✅ Validation du diagnostic</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Le diagnostic a été réalisé. Veuillez valider ou refuser la réparation.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💬 Commentaire (optionnel)
                  </label>
                  <textarea
                    value={clientComment}
                    onChange={(e) => setClientComment(e.target.value)}
                    placeholder="Ajoutez un commentaire ou une question pour le réparateur..."
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => submitClientValidation("accept")}
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {isSubmitting && validationAction === "accept" ? "⏳ Envoi..." : "✅ Valider la réparation"}
                  </button>
                  <button
                    onClick={() => submitClientValidation("reject")}
                    disabled={isSubmitting}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {isSubmitting && validationAction === "reject" ? "⏳ Envoi..." : "❌ Refuser la réparation"}
                  </button>
                </div>
              </div>
            )}

            {/* Message si déjà validé */}
            {isAlreadyValidated && repair?.status !== "🔬 Diagnostic" && (
              <div className="p-6 border-b bg-green-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">✅</div>
                  <div>
                    <p className="font-semibold text-green-800">Réparation validée</p>
                    <p className="text-sm text-green-700">Vous avez validé cette réparation. Merci !</p>
                    {repair?.client_comment && (
                      <p className="text-sm text-gray-600 mt-2">💬 Votre commentaire : "{repair.client_comment}"</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Message si refusé */}
            {isRejected && (
              <div className="p-6 border-b bg-pink-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xl">❌</div>
                  <div>
                    <p className="font-semibold text-pink-800">Réparation refusée</p>
                    <p className="text-sm text-pink-700">Vous avez refusé cette réparation.</p>
                    {repair?.client_comment && (
                      <p className="text-sm text-gray-600 mt-2">💬 Votre commentaire : "{repair.client_comment}"</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Détails appareil - AVEC MESSAGE POUR CODE NON FOURNI */}
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-700 mb-3">📱 Appareil</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <p><strong>Modèle :</strong> {repair?.device}</p>
                <p className="mt-2"><strong>Problème :</strong> {repair?.issue}</p>
                {repair?.imei && repair.imei !== "NC" && (
                  <p className="mt-2"><strong>IMEI :</strong> {repair?.imei}</p>
                )}
                
                {/* CODE AVEC MESSAGE D'ALERTE */}
                {repair?.unlock_code && repair.unlock_code !== "NC" && repair.unlock_code !== "" ? (
                  <p className="mt-2"><strong>🔑 Code :</strong> {repair.unlock_code}</p>
                ) : (
                  <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 text-lg">⚠️</span>
                      <span className="text-sm font-semibold text-red-700">Code NON FOURNI</span>
                    </div>
                    <p className="text-xs text-red-600 mt-1">Test impossible - Pas pris en garantie</p>
                  </div>
                )}
              </div>
            </div>

            {/* Prix final */}
            {repair?.final_price > 0 && (
              <div className="p-6 border-b">
                <h3 className="font-semibold text-gray-700 mb-3">💰 Montant</h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{repair?.final_price} €</p>
                  {repair?.tax_rate > 0 && (
                    <p className="text-xs text-gray-400 mt-1">TVA {repair.tax_rate}% incluse</p>
                  )}
                </div>
              </div>
            )}

            {/* Commentaire historique */}
            {repair?.client_comment && !isAlreadyValidated && !isRejected && repair?.status !== "🔬 Diagnostic" && (
              <div className="p-6 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-700 mb-2">💬 Votre commentaire</h3>
                <p className="text-gray-600 italic">"{repair.client_comment}"</p>
              </div>
            )}

            {/* Message si terminé */}
            {repair?.status === "✅ Terminé" && (
              <div className="p-6 border-b bg-green-50">
                <div className="text-center">
                  <p className="text-green-800 font-medium">✅ Votre appareil est prêt à être récupéré Merci !</p>
                  <p className="text-sm text-green-700 mt-1">Merci de votre confiance.</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-6 bg-gray-50 text-center">
              <p className="text-sm text-gray-500">
                Dernière mise à jour : {formatDate(repair?.updated_at)}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Lien valable 30 jours - Suivez l'évolution de votre réparation
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </Layout>
  );
}