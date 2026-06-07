"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, getCurrentUser } from "../../lib/supabase";
import Layout from "../../components/Layout";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [permissions, setPermissions] = useState(null);
  const [technicianName, setTechnicianName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [technicians, setTechnicians] = useState([]);

  // Paramètres existants
  const [settings, setSettings] = useState({
    company_name: "",
    contact_phone: "",
    contact_email: "",
    contact_address: "",
    logo_url: "",
    invoice_prefix: "FACT-",
    default_vat: 20,
    notification_email: "",
    low_stock_alert: true,
    auto_backup: false,
  });

  useEffect(() => {
    loadData();
    loadTechnicians();
  }, []);

  const loadData = async () => {
    try {
      // Récupérer les permissions
      const techPermissions = sessionStorage.getItem("technician_permissions");
      if (techPermissions) {
        const tech = JSON.parse(techPermissions);
        setPermissions(tech);
        setTechnicianName(tech.name || "");
      }

      // Récupérer les infos de l'entreprise
      const user = await getCurrentUser();
      if (user) {
        setCompanyEmail(user.email || "");

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data && !error) {
          setCompanyName(data.company_name || "");
          setCompanyPhone(data.contact_phone || "");
          setCompanyAddress(data.contact_address || "");
          setSettings({
            company_name: data.company_name || "",
            contact_phone: data.contact_phone || "",
            contact_email: data.email || "",
            contact_address: data.contact_address || "",
            logo_url: data.logo_url || "",
            invoice_prefix: "FACT-",
            default_vat: 20,
            notification_email: data.email || "",
            low_stock_alert: true,
            auto_backup: false,
          });

          if (data.logo_url) {
            setLogoPreview(data.logo_url);
          }
        }
      }
    } catch (err) {
      console.error("Erreur chargement:", err);
    }
  };

  const loadTechnicians = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const { data } = await supabase
        .from("technicians")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);
      setTechnicians(data || []);
    } catch (error) {
      console.error("Erreur chargement techniciens:", error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage("");

    try {
      const user = await getCurrentUser();
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            company_name: settings.company_name,
            contact_phone: settings.contact_phone,
            contact_address: settings.contact_address,
            logo_url: settings.logo_url,
          })
          .eq("id", user.id);

        if (error) throw error;
        setMessage("✅ Paramètres enregistrés avec succès");
        setTimeout(() => setMessage(""), 3000);

        // Recharger la page pour mettre à jour le logo dans la navigation
        router.refresh();
      }
    } catch (err) {
      setMessage("❌ Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file) => {
    if (!file) return;

    if (
      !file.type.includes("image/png") &&
      !file.type.includes("image/jpeg") &&
      !file.type.includes("image/jpg")
    ) {
      setMessage("❌ Seuls les fichiers PNG, JPG ou JPEG sont acceptés");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("❌ Le fichier ne doit pas dépasser 2MB");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Non authentifié");

      const fileExt = file.name.split(".").pop();
      const fileName = `logo_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes("bucket")) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("company-logos").getPublicUrl(filePath);

          setSettings({ ...settings, logo_url: publicUrl });
          setLogoPreview(publicUrl);
          setMessage("✅ Logo téléchargé");
        } else {
          throw uploadError;
        }
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from("company-logos").getPublicUrl(filePath);

        setSettings({ ...settings, logo_url: publicUrl });
        setLogoPreview(publicUrl);
        setMessage("✅ Logo téléchargé avec succès");
      }

      setTimeout(() => saveSettings(), 500);
    } catch (err) {
      console.error("Erreur upload:", err);
      setMessage("❌ Erreur lors du téléchargement: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadLogo(file);
    }
  };

  const removeLogo = async () => {
    setSettings({ ...settings, logo_url: "" });
    setLogoPreview(null);
    await saveSettings();
    setMessage("✅ Logo supprimé");
  };

  const isGerant = permissions?.is_gerant === true;

  const tabs = [
    { id: "general", label: "⚙️ Général", visible: true },
    { id: "company", label: "🏢 Entreprise", visible: true },
    { id: "technicians", label: "👨‍🔧 Techniciens", visible: isGerant },
    { id: "logs", label: "📋 Logs", visible: isGerant },
  ];

  const visibleTabs = tabs.filter((tab) => tab.visible);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">⚙️ Paramètres</h1>

        {message && (
          <div
            className={`p-3 rounded-lg mb-4 ${message.includes("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {message}
          </div>
        )}

        {/* Onglets */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6 flex-wrap">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "text-orange-600 border-b-2 border-orange-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Onglet Général */}
          {activeTab === "general" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Informations générales</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du technicien
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email connecté
                  </label>
                  <input
                    type="text"
                    value={companyEmail}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input
                    type="text"
                    value="MBX Réparations v2.0"
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Onglet Entreprise */}
          {activeTab === "company" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Informations de l'entreprise</h2>

              {/* Upload Logo */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🖼️ Logo de l'entreprise
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="w-16 h-16 object-contain border rounded-lg bg-white p-1"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                      🔧
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG ou JPEG. Max 2MB.</p>
                  </div>
                </div>
                {uploading && (
                  <div className="mt-2 text-sm text-orange-600">⏳ Téléchargement en cours...</div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Votre entreprise"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={settings.contact_phone}
                    onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0612345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="contact@entreprise.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <textarea
                    value={settings.contact_address}
                    onChange={(e) => setSettings({ ...settings, contact_address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="Adresse complète"
                  />
                </div>
                <button
                  onClick={saveSettings}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition"
                >
                  {loading ? "Enregistrement..." : "💾 Enregistrer"}
                </button>
              </div>
            </div>
          )}

          {/* Onglet Techniciens */}
          {activeTab === "technicians" && isGerant && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Gestion des techniciens</h2>
                <Link
                  href="/technicians"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  + Accéder à la gestion
                </Link>
              </div>
              <p className="text-gray-500 mb-4">
                Gérez les techniciens, leurs codes d'accès et permissions d'accès aux différentes
                sections.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  📋 {technicians.length} technicien(s) actif(s)
                </p>
              </div>
            </div>
          )}

          {/* Onglet Logs */}
          {activeTab === "logs" && isGerant && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Historique des actions</h2>
                <Link
                  href="/logs"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  📋 Voir tous les logs
                </Link>
              </div>
              <p className="text-gray-500 mb-4">
                Consultez l'historique complet des connexions et actions effectuées par les
                techniciens.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
