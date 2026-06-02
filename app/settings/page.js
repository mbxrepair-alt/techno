"use client";

// Suppression définitive de l'avertissement Next.js Image
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    if (message.includes('Image with src') || 
        message.includes('width or height modified') ||
        message.includes('next/image')) {
      return;
    }
    originalWarn(...args);
  };
}

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [user, setUser] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    contact_phone: "",
    contact_address: "",
    email: "",
    logo_url: "",
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (error) {
      console.error("Erreur chargement profil:", error);
    } else {
      setFormData({
        name: profile?.name || "",
        company_name: profile?.company_name || "",
        contact_phone: profile?.contact_phone || "",
        contact_address: profile?.contact_address || "",
        email: currentUser.email || "",
        logo_url: profile?.logo_url || "",
      });
      setLogoPreview(profile?.logo_url || null);
    }
    setLoading(false);
  };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.includes('image/png')) {
      showMessage("❌ Seuls les fichiers PNG sont acceptés", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showMessage("❌ Le fichier ne doit pas dépasser 2MB", "error");
      return;
    }

    setUploading(true);
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('userId', user.id);

    try {
      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      
      if (data.success) {
        setLogoPreview(data.url);
        setFormData({ ...formData, logo_url: data.url });
        showMessage("✅ Logo mis à jour", "success");
      } else {
        showMessage("❌ Erreur: " + data.error, "error");
      }
    } catch (error) {
      console.error(error);
      showMessage("❌ Erreur lors de l'upload", "error");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    if (confirm("Supprimer votre logo ?")) {
      const { error } = await supabase
        .from("profiles")
        .update({ logo_url: null })
        .eq("id", user.id);

      if (error) {
        showMessage("❌ Erreur lors de la suppression", "error");
      } else {
        setLogoPreview(null);
        setFormData({ ...formData, logo_url: "" });
        showMessage("✅ Logo supprimé", "success");
      }
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    
    if (formData.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: formData.email
      });
      if (emailError) {
        showMessage("❌ Erreur mise à jour email: " + emailError.message, "error");
        setSaving(false);
        return;
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: formData.name,
        company_name: formData.company_name,
        contact_phone: formData.contact_phone,
        contact_address: formData.contact_address,
        logo_url: formData.logo_url,
      })
      .eq("id", user.id);

    if (profileError) {
      showMessage("❌ Erreur: " + profileError.message, "error");
    } else {
      showMessage("✅ Informations mises à jour", "success");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">⏳ Chargement...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Paramètres</h1>
              <p className="text-sm text-gray-500">Gérez les informations de votre atelier</p>
            </div>
          </div>

          {message.text && (
            <div className={`mb-4 p-3 rounded-lg ${message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            {/* Section Logo */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo de l'atelier</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    width="80"
                    height="80"
                    loading="eager"
                    style={{ width: "80px", height: "80px", objectFit: "contain" }}
                    className="rounded-lg border"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center border flex-shrink-0">
                    <span className="text-3xl">🔧</span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">PNG uniquement, max 2MB</p>
                  {uploading && <p className="text-xs text-blue-500 mt-1">Upload en cours...</p>}
                  {logoPreview && (
                    <button
                      onClick={removeLogo}
                      className="text-xs text-red-500 hover:text-red-700 mt-1"
                    >
                      Supprimer le logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="votre@email.com"
              />
              <p className="text-xs text-gray-400 mt-1">⚠️ Changer l'email vous déconnectera</p>
            </div>

            {/* Nom complet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Votre nom"
              />
            </div>

            {/* Nom de l'atelier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'atelier / société</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom de votre atelier"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="01 23 45 67 89"
              />
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <textarea
                name="contact_address"
                value={formData.contact_address}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Adresse de votre atelier"
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={saveSettings}
                disabled={saving || uploading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "💾 Enregistrer les modifications"}
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}