"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../../components/Layout";

export default function AdminLicencesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [licences, setLicences] = useState([]);
  const [deviceRequests, setDeviceRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceEmail, setNewDeviceEmail] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [activeTab, setActiveTab] = useState("requests");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Vérifier si l'utilisateur est admin via la table profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData?.is_admin) {
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);
      await loadData();
    } catch (error) {
      console.error("Erreur:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    // Récupérer les profils
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Récupérer les licences
    const { data: licencesData } = await supabase
      .from("licences")
      .select("*, profile:profile_id(*)")
      .order("requested_at", { ascending: false });

    // Récupérer les demandes d'appareil
    const { data: requestsData } = await supabase
      .from("device_requests")
      .select("*, profile:profile_id(*), processed_by_user:processed_by(*)")
      .order("requested_at", { ascending: false });

    setProfiles(profilesData || []);
    setLicences(licencesData || []);
    setDeviceRequests(requestsData || []);
  };

  const approveDeviceRequest = async (requestId) => {
    const request = deviceRequests.find(r => r.id === requestId);
    if (!request) return;

    const currentUser = await getCurrentUser();

    // Mettre à jour la demande
    await supabase
      .from("device_requests")
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
        processed_by: currentUser.id
      })
      .eq("id", requestId);

    // Ajouter ou mettre à jour la licence
    const existingLicence = licences.find(l => l.email === request.email);
    
    if (existingLicence) {
      await supabase
        .from("licences")
        .update({
          device_fingerprint: request.device_fingerprint,
          device_name: request.device_name,
          device_type: request.device_type,
          status: "active",
          approved_at: new Date().toISOString()
        })
        .eq("id", existingLicence.id);
    } else {
      await supabase
        .from("licences")
        .insert([{
          profile_id: request.profile_id,
          email: request.email,
          device_fingerprint: request.device_fingerprint,
          device_name: request.device_name,
          device_type: request.device_type,
          status: "active",
          approved_at: new Date().toISOString()
        }]);
    }

    alert("✅ Appareil approuvé !");
    await loadData();
  };

  const rejectDeviceRequest = async (requestId) => {
    const currentUser = await getCurrentUser();
    
    await supabase
      .from("device_requests")
      .update({
        status: "rejected",
        processed_at: new Date().toISOString(),
        processed_by: currentUser.id
      })
      .eq("id", requestId);

    alert("❌ Demande rejetée");
    await loadData();
  };

  const revokeDevice = async (licenceId) => {
    if (!confirm("Confirmer la révocation de cet appareil ?")) return;

    await supabase
      .from("licences")
      .update({
        device_fingerprint: null,
        status: "revoked",
        approved_at: null
      })
      .eq("id", licenceId);

    alert("✅ Appareil révoqué");
    await loadData();
  };

  const addManualDevice = async () => {
    if (!newDeviceEmail || !newDeviceName) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    const profile = profiles.find(p => p.email === newDeviceEmail);
    if (!profile) {
      alert("Utilisateur non trouvé");
      return;
    }

    const deviceId = `manual_${Date.now()}_${Math.random().toString(36)}`;
    
    await supabase
      .from("licences")
      .insert([{
        profile_id: profile.id,
        email: newDeviceEmail,
        device_fingerprint: deviceId,
        device_name: newDeviceName,
        device_type: "manuel",
        status: "active",
        approved_at: new Date().toISOString()
      }]);

    alert("✅ Appareil ajouté");
    setShowAddModal(false);
    setNewDeviceEmail("");
    setNewDeviceName("");
    await loadData();
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      active: "bg-blue-100 text-blue-800",
      revoked: "bg-gray-100 text-gray-800"
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || "bg-gray-100"}`}>{status}</span>;
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

  if (!isAdmin) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Accès non autorisé</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🔐 Gestion des licences</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez les appareils autorisés et les demandes</p>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 font-medium transition ${activeTab === "requests" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          >
            📋 Demandes ({deviceRequests.filter(r => r.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("devices")}
            className={`px-4 py-2 font-medium transition ${activeTab === "devices" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          >
            💻 Appareils autorisés ({licences.filter(l => l.status === "active").length})
          </button>
        </div>

        {/* Bouton ajout manuel */}
        <button
          onClick={() => setShowAddModal(true)}
          className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          ➕ Ajouter un appareil manuellement
        </button>

        {/* Demandes en attente */}
        {activeTab === "requests" && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b bg-orange-50">
              <h2 className="font-semibold text-orange-800">⏳ Demandes en attente</h2>
            </div>
            <div className="divide-y">
              {deviceRequests.filter(r => r.status === "pending").length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucune demande en attente
                </div>
              ) : (
                deviceRequests.filter(r => r.status === "pending").map((request) => (
                  <div key={request.id} className="p-4">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <div className="font-medium">{request.email}</div>
                        <div className="text-sm text-gray-600">Appareil: {request.device_name || request.device_type || "Inconnu"}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Demandé le {new Date(request.requested_at).toLocaleString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveDeviceRequest(request.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700"
                        >
                          ✅ Approuver
                        </button>
                        <button
                          onClick={() => rejectDeviceRequest(request.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
                        >
                          ❌ Refuser
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Appareils autorisés */}
        {activeTab === "devices" && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b bg-green-50">
              <h2 className="font-semibold text-green-800">✅ Appareils autorisés</h2>
            </div>
            <div className="divide-y">
              {licences.filter(l => l.status === "active").length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucun appareil autorisé
                </div>
              ) : (
                licences.filter(l => l.status === "active").map((licence) => (
                  <div key={licence.id} className="p-4">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <div className="font-medium">{licence.email}</div>
                        <div className="text-sm text-gray-600">Appareil: {licence.device_name || licence.device_type || "Inconnu"}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Approuvé le {new Date(licence.approved_at).toLocaleString('fr-FR')}
                        </div>
                        {licence.last_login && (
                          <div className="text-xs text-gray-400">Dernière connexion: {new Date(licence.last_login).toLocaleString('fr-FR')}</div>
                        )}
                      </div>
                      <button
                        onClick={() => revokeDevice(licence.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
                      >
                        🔄 Révoquer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal ajout manuel */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4">➕ Ajouter un appareil</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email utilisateur</label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={newDeviceEmail}
                  onChange={(e) => setNewDeviceEmail(e.target.value)}
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {profiles.map(profile => (
                    <option key={profile.id} value={profile.email}>{profile.email}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'appareil</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: iPhone de Jean, PC Bureau..."
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={addManualDevice} className="flex-1 bg-blue-600 text-white p-2 rounded-lg">Ajouter</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 p-2 rounded-lg">Annuler</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
