"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Layout from "../../../../components/Layout";

export default function ClientTicketPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  
  const [loading, setLoading] = useState(true);
  const [repair, setRepair] = useState(null);
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      loadTicket();
    }
  }, [id]);

  const loadTicket = async () => {
    setLoading(true);
    try {
      // Récupérer la réparation
      const { data: repairData, error: repairError } = await supabase
        .from("repairs")
        .select("*, clients(*)")
        .eq("id", id)
        .single();

      if (repairError) throw repairError;

      setRepair(repairData);
      setClient(repairData.clients);

    } catch (err) {
      console.error("Erreur:", err);
      setError("Ticket non trouvé");
    } finally {
      setLoading(false);
    }
  };

  // Configuration des statuts en horizontal
  const steps = [
    { status: "📥 Réceptionné", label: "Réception", icon: "📥", step: 1 },
    { status: "🔬 Diagnostic", label: "Diagnostic", icon: "🔬", step: 2 },
    { status: "✅ Validé client", label: "Validation", icon: "✅", step: 3 },
    { status: "🔧 En réparation", label: "Réparation", icon: "🔧", step: 4 },
    { status: "✅ Terminé", label: "Terminé", icon: "✅", step: 5 },
    { status: "📦 Rendu", label: "Rendu", icon: "📦", step: 6 }
  ];

  const getCurrentStep = () => {
    const step = steps.find(s => s.status === repair?.status);
    return step ? step.step : 1;
  };

  const getStatusInfo = (status) => {
    const map = {
      "📥 Réceptionné": { color: "bg-yellow-500", text: "Réceptionné" },
      "🔬 Diagnostic": { color: "bg-blue-500", text: "Diagnostic" },
      "✅ Validé client": { color: "bg-green-500", text: "Validé" },
      "🔧 En réparation": { color: "bg-orange-500", text: "En réparation" },
      "✅ Terminé": { color: "bg-purple-500", text: "Terminé" },
      "📦 Rendu": { color: "bg-gray-500", text: "Rendu" }
    };
    return map[status] || { color: "bg-gray-500", text: status };
  };

  const currentStep = getCurrentStep();
  const statusInfo = getStatusInfo(repair?.status);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !repair) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-semibold">Ticket non trouvé</p>
            <button onClick={() => router.push("/client")} className="mt-4 text-blue-600 hover:underline">
              ← Retour à mes tickets
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        {/* En-tête */}
        <div className="mb-6">
          <button onClick={() => router.push("/client")} className="text-blue-600 hover:underline mb-4 inline-block">
            ← Retour à mes tickets
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Suivi de réparation</h1>
          <p className="text-gray-500">Ticket n° MBX-{repair.id}</p>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          
          {/* Bannière statut */}
          <div className={`${statusInfo.color} text-white p-4 text-center`}>
            <span className="text-xl font-semibold">{statusInfo.text}</span>
          </div>

          {/* TIMELINE HORIZONTALE */}
          <div className="p-6 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-700 mb-6 text-center">📊 Avancement de votre réparation</h3>
            
            <div className="relative">
              {/* Barre de progression horizontale */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full -z-10">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>
              
              {/* Étapes */}
              <div className="flex justify-between">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-lg
                      transition-all duration-300 z-10
                      ${currentStep >= step.step 
                        ? 'bg-blue-600 text-white shadow-lg scale-110' 
                        : 'bg-gray-300 text-gray-500'}
                    `}>
                      {step.icon}
                    </div>
                    <span className={`text-xs mt-2 text-center ${currentStep >= step.step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Détails de la réparation */}
          <div className="p-6 space-y-4">
            {/* Client */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-2">👤 Informations client</h3>
              <p><strong>Nom :</strong> {client?.name}</p>
              <p><strong>Téléphone :</strong> {client?.phone}</p>
              <p><strong>Email :</strong> {client?.email}</p>
            </div>

            {/* Appareil */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-2">📱 Appareil</h3>
              <p><strong>Modèle :</strong> {repair.device}</p>
              <p><strong>Panne :</strong> {repair.issue}</p>
              {repair.imei && repair.imei !== "NC" && (
                <p><strong>IMEI :</strong> {repair.imei}</p>
              )}
              
              {/* Code - Message si non fourni */}
              {repair.unlock_code && repair.unlock_code !== "NC" && repair.unlock_code !== "" ? (
                <p className="mt-2"><strong>🔑 Code :</strong> {repair.unlock_code}</p>
              ) : (
                <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <p className="text-sm font-semibold text-red-700">⚠️ Code NON FOURNI</p>
                  <p className="text-xs text-red-600">Test impossible - Pas pris en garantie</p>
                </div>
              )}
            </div>

            {/* Diagnostic */}
            {repair.diagnosis && (
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 mb-2">🔍 Diagnostic</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{repair.diagnosis}</p>
                {repair.risks && (
                  <p className="text-sm mt-2 text-orange-600">⚠️ {repair.risks}</p>
                )}
              </div>
            )}

            {/* Réparation effectuée */}
            {repair.repair_description && (
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-2">🔧 Réparation effectuée</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{repair.repair_description}</p>
              </div>
            )}

            {/* Prix */}
            {repair.final_price > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <h3 className="font-semibold text-gray-700 mb-2">💰 Montant</h3>
                <p className="text-3xl font-bold text-blue-600">{repair.final_price} €</p>
              </div>
            )}

            {/* Dates */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-2">📅 Dates importantes</h3>
              <p><strong>Dépôt :</strong> {new Date(repair.created_at).toLocaleDateString('fr-FR')}</p>
              {repair.completion_date && (
                <p><strong>Terminé le :</strong> {new Date(repair.completion_date).toLocaleDateString('fr-FR')}</p>
              )}
              <p className="text-sm text-gray-400 mt-2">Dernière mise à jour : {new Date(repair.updated_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Pied de page */}
          <div className="p-4 bg-gray-50 text-center border-t">
            <p className="text-xs text-gray-400">MBX Réparations - Votre atelier de confiance</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}