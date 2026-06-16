"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../../components/Layout";

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [licences, setLicences] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLicenceModal, setShowLicenceModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterLicence, setFilterLicence] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trial: 0,
    expired: 0,
    admin: 0,
    unlimited: 0,
  });

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin && user.email !== "mbxrepair@gmail.com") {
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
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: licencesData } = await supabase.from("licences").select("*");

    const total = profilesData?.length || 0;
    const admin = profilesData?.filter((p) => p.is_admin === true).length || 0;
    const active =
      licencesData?.filter(
        (l) =>
          l.status === "active" &&
          !l.is_unlimited &&
          (!l.is_trial || new Date(l.trial_end_date) > new Date())
      ).length || 0;
    const trial =
      licencesData?.filter((l) => l.is_trial === true && new Date(l.trial_end_date) > new Date())
        .length || 0;
    const expired =
      licencesData?.filter((l) => l.is_trial === true && new Date(l.trial_end_date) <= new Date())
        .length || 0;
    const unlimited = licencesData?.filter((l) => l.is_unlimited === true).length || 0;

    setStats({ total, active, trial, expired, admin, unlimited });
    setUsers(profilesData || []);
    setLicences(licencesData || []);
  };

  const getUserLicence = (email) => licences.find((l) => l.email === email);

  const remainingLabel = (end) => {
    const daysLeft = Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { expired: true, label: "" };
    if (daysLeft >= 60) return { expired: false, label: `${Math.round(daysLeft / 30)} mois` };
    return { expired: false, label: `${daysLeft}j` };
  };

  const getLicenceStatus = (email) => {
    const licence = getUserLicence(email);
    if (!licence) return { text: "❌ Aucune", color: "bg-gray-100 text-gray-700" };
    if (licence.status === "suspended")
      return { text: "⏸ Suspendue", color: "bg-yellow-100 text-yellow-800" };
    if (licence.is_unlimited)
      return { text: "♾️ Illimitée", color: "bg-purple-100 text-purple-800" };

    // Licence d'essai ou à durée : on affiche le temps restant
    const end = licence.trial_end_date || licence.expires_at;
    if (end) {
      const { expired, label } = remainingLabel(end);
      if (expired) return { text: "📅 Expirée", color: "bg-red-100 text-red-800" };
      return licence.is_trial
        ? { text: `🎁 Essai (${label})`, color: "bg-green-100 text-green-800" }
        : { text: `✅ Active (${label})`, color: "bg-blue-100 text-blue-800" };
    }
    return { text: "✅ Active", color: "bg-blue-100 text-blue-800" };
  };

  // ✅ Fonction pour changer le mot de passe directement
  const changePasswordDirect = async (userId, email) => {
    const newPassword = prompt(
      `Nouveau mot de passe pour ${email} :\n\n(minimum 6 caractères, une majuscule, une minuscule, un chiffre)`
    );

    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert("❌ Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      alert("❌ Le mot de passe doit contenir au moins une majuscule");
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      alert("❌ Le mot de passe doit contenir au moins une minuscule");
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      alert("❌ Le mot de passe doit contenir au moins un chiffre");
      return;
    }

    try {
      const response = await fetch("/api/admin/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password: newPassword }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Mot de passe modifié pour ${email}`);
      } else {
        alert("❌ Erreur: " + result.error);
      }
    } catch (error) {
      alert("❌ Erreur lors du changement de mot de passe");
    }
  };

  const updateUserProfile = async (userId, updates) => {
    const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
    if (error) alert("Erreur: " + error.message);
    else {
      alert("✅ Profil mis à jour");
      await loadData();
      setShowUserModal(false);
    }
  };

  const activateUnlimitedLicence = async (email, profileId) => {
    const { error } = await supabase.from("licences").upsert(
      {
        email: email,
        profile_id: profileId,
        status: "active",
        is_trial: false,
        is_unlimited: true,
        unlimited_since: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    if (error) alert("Erreur: " + error.message);
    else {
      alert("♾️ Licence illimitée activée");
      await loadData();
      setShowLicenceModal(false);
    }
  };

  const createAccount = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      email: fd.get("email"),
      password: fd.get("password"),
      name: fd.get("name"),
      phone: fd.get("phone"),
      shop_name: fd.get("shop_name"),
      duration: fd.get("duration"),
      access_code: fd.get("access_code"),
    };
    if (!payload.email || !payload.password) {
      alert("Email et mot de passe requis");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        alert(`✅ Compte créé : ${payload.email}\n\n🔑 Code technicien : ${result.access_code}\n\nLe client se connecte avec son email + mot de passe, puis ce code à 4 chiffres.`);
        setShowCreateModal(false);
        await loadData();
      } else {
        alert("❌ " + (result.error || "Erreur"));
      }
    } catch (err) {
      alert("❌ Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const renewLicence = async (email, days) => {
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + days);

    const { error } = await supabase
      .from("licences")
      .update({
        status: "active",
        is_trial: false,
        is_unlimited: false,
        trial_end_date: null,
        expires_at: newEndDate.toISOString(),
      })
      .eq("email", email);

    if (error) alert("Erreur: " + error.message);
    else {
      alert(`✅ Licence renouvelée pour ${days} jours`);
      await loadData();
      setShowLicenceModal(false);
    }
  };

  const suspendLicence = async (email) => {
    const { error } = await supabase
      .from("licences")
      .update({ status: "suspended" })
      .eq("email", email);
    if (error) alert("Erreur: " + error.message);
    else {
      alert("⏸ Licence suspendue");
      await loadData();
      setShowLicenceModal(false);
    }
  };

  const reactivateLicence = async (email) => {
    const { error } = await supabase
      .from("licences")
      .update({ status: "active" })
      .eq("email", email);
    if (error) alert("Erreur: " + error.message);
    else {
      alert("▶️ Licence réactivée");
      await loadData();
      setShowLicenceModal(false);
    }
  };

  const deleteUser = async (userId, email) => {
    if (!confirm(`⚠️ Supprimer définitivement ${email} ?`)) return;
    await supabase.from("licences").delete().eq("email", email);
    await supabase.from("profiles").delete().eq("id", userId);
    alert("✅ Utilisateur supprimé");
    await loadData();
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    alert(error ? "❌ Erreur: " + error.message : `✅ Email envoyé à ${email}`);
  };

  const toggleAdmin = async (userId, currentIsAdmin) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !currentIsAdmin })
      .eq("id", userId);

    if (error) {
      alert("Erreur: " + error.message);
    } else {
      alert(currentIsAdmin ? "👤 Rôle utilisateur attribué" : "👑 Rôle administrateur attribué");
      await loadData();
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    if (filterRole === "admin") return matchesSearch && user.is_admin === true;
    if (filterRole === "user") return matchesSearch && user.is_admin !== true;

    const licence = getUserLicence(user.email);
    if (filterLicence === "active")
      return matchesSearch && licence?.status === "active" && !licence?.is_unlimited;
    if (filterLicence === "unlimited") return matchesSearch && licence?.is_unlimited === true;
    if (filterLicence === "trial")
      return (
        matchesSearch && licence?.is_trial === true && new Date(licence.trial_end_date) > new Date()
      );
    if (filterLicence === "expired")
      return (
        matchesSearch &&
        licence?.is_trial === true &&
        new Date(licence.trial_end_date) <= new Date()
      );
    if (filterLicence === "no_license") return matchesSearch && !licence;

    return matchesSearch;
  });

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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">👥 Gestion des utilisateurs</h1>
            <p className="text-gray-500 text-sm mt-1">Gérez les comptes et licences</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition"
          >
            ➕ Créer un compte
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-xs text-gray-600">Actives</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.unlimited}</div>
            <div className="text-xs text-gray-600">Illimitées</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.trial}</div>
            <div className="text-xs text-gray-600">Essai</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <div className="text-xs text-gray-600">Expirées</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.admin}</div>
            <div className="text-xs text-gray-600">Admins</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateurs</option>
              <option value="user">Utilisateurs</option>
            </select>
            <select
              value={filterLicence}
              onChange={(e) => setFilterLicence(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="all">Toutes licences</option>
              <option value="active">✅ Actives</option>
              <option value="unlimited">♾️ Illimitées</option>
              <option value="trial">🎁 Essai</option>
              <option value="expired">📅 Expirées</option>
              <option value="no_license">❌ Sans licence</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Utilisateur</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Licence</th>
                  <th className="px-4 py-3 text-left">Rôle</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.name || "-"}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{user.phone || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getLicenceStatus(user.email).color}`}
                      >
                        {getLicenceStatus(user.email).text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_admin ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          👑 Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100">👤 User</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Modifier profil"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => toggleAdmin(user.id, user.is_admin)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                          title={user.is_admin ? "Retirer admin" : "Nommer admin"}
                        >
                          👑
                        </button>
                        <button
                          onClick={() => changePasswordDirect(user.id, user.email)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Changer mot de passe"
                        >
                          🔒
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowLicenceModal(true);
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Gérer licence"
                        >
                          📄
                        </button>
                        {!user.is_admin && (
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Modifier Profil */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">✏️ Modifier le profil</h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                updateUserProfile(selectedUser.id, {
                  name: fd.get("name"),
                  phone: fd.get("phone"),
                  shop_name: fd.get("shop_name"),
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    disabled
                    className="w-full p-2 border rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedUser.name || ""}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={selectedUser.phone || ""}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Atelier</label>
                  <input
                    type="text"
                    name="shop_name"
                    defaultValue={selectedUser.shop_name || ""}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded-lg">
                    💾 Sauvegarder
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 bg-gray-200 p-2 rounded-lg"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestion Licence */}
      {showLicenceModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">📄 Gestion licence</h2>
              <button
                onClick={() => setShowLicenceModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="mb-4">
              <p className="font-medium">{selectedUser.email}</p>
              <p className="text-sm text-gray-500">{selectedUser.name}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Statut :</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${getLicenceStatus(selectedUser.email).color}`}
                >
                  {getLicenceStatus(selectedUser.email).text}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => activateUnlimitedLicence(selectedUser.email, selectedUser.id)}
                className="w-full bg-purple-600 text-white p-2 rounded-lg"
              >
                ♾️ Licence illimitée
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => renewLicence(selectedUser.email, 30)}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg text-sm"
                >
                  📅 1 mois
                </button>
                <button
                  onClick={() => renewLicence(selectedUser.email, 180)}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg text-sm"
                >
                  📅 6 mois
                </button>
                <button
                  onClick={() => renewLicence(selectedUser.email, 365)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg text-sm"
                >
                  📅 1 an
                </button>
              </div>
              <div className="border-t my-2"></div>
              <button
                onClick={() => suspendLicence(selectedUser.email)}
                className="w-full bg-yellow-600 text-white p-2 rounded-lg"
              >
                ⏸ Suspendre
              </button>
              <button
                onClick={() => reactivateLicence(selectedUser.email)}
                className="w-full bg-green-600 text-white p-2 rounded-lg"
              >
                ▶️ Réactiver
              </button>
            </div>
            <button
              onClick={() => setShowLicenceModal(false)}
              className="w-full mt-4 bg-gray-200 p-2 rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal Créer un compte */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">➕ Créer un compte</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <form onSubmit={createAccount} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" name="email" required className="w-full p-2 border rounded-lg" placeholder="client@exemple.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mot de passe *</label>
                <input type="text" name="password" required minLength={6} className="w-full p-2 border rounded-lg" placeholder="6 caractères minimum" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input type="text" name="name" className="w-full p-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input type="tel" name="phone" className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Atelier</label>
                  <input type="text" name="shop_name" className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code technicien (4 chiffres)</label>
                <input type="text" name="access_code" defaultValue="1234" maxLength={4} inputMode="numeric" pattern="\d{4}" className="w-full p-2 border rounded-lg font-mono" placeholder="1234" />
                <p className="text-xs text-gray-500 mt-1">Le client tape ce code après son email + mot de passe.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Durée de la licence</label>
                <select name="duration" defaultValue="1m" className="w-full p-2 border rounded-lg">
                  <option value="1m">📅 1 mois</option>
                  <option value="6m">📅 6 mois</option>
                  <option value="1y">📅 1 an</option>
                  <option value="unlimited">♾️ Illimitée</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white p-2.5 rounded-lg font-semibold">
                  {creating ? "Création..." : "✅ Créer le compte"}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-200 p-2.5 rounded-lg">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
