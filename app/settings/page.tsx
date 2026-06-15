"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
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
  const [exporting, setExporting] = useState(false);

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
      const techPermissions = localStorage.getItem("technician_permissions");
      if (techPermissions) {
        const tech = JSON.parse(techPermissions);
        setPermissions(tech);
        setTechnicianName(tech.name || "");
      }

      // Récupérer les infos de l'entreprise
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (companyId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", companyId)
          .single();

        if (data && !error) {
          setCompanyEmail(data.email || "");
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
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) return;
      const { data } = await supabase
        .from("technicians")
        .select("*")
        .eq("user_id", companyId)
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
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (companyId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            company_name: settings.company_name,
            contact_phone: settings.contact_phone,
            contact_address: settings.contact_address,
            logo_url: settings.logo_url,
          })
          .eq("id", companyId);

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
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) throw new Error("Non authentifié");

      const fileExt = file.name.split(".").pop();
      const fileName = `logo_${companyId}_${Date.now()}.${fileExt}`;
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

  // Export complet de la base du compte (clients + réparations) en Excel.
  const exportDatabase = async () => {
    setExporting(true);
    try {
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) return;

      const [clientsRes, repairsRes] = await Promise.all([
        supabase.from("clients").select("*").eq("user_id", companyId),
        supabase.from("repairs").select("*").eq("user_id", companyId).order("created_at", { ascending: false }),
      ]);

      const clients = clientsRes.data || [];
      const repairs = repairsRes.data || [];

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      if (clients.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients), "Clients");
      }
      if (repairs.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(repairs), "Reparations");
      }
      if (!clients.length && !repairs.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Aucune donnée"]]), "Vide");
      }

      const today = new Date().toISOString().slice(0, 10);
      const atelier = (settings.company_name || companyName || "atelier")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "") || "atelier";
      XLSX.writeFile(wb, `${atelier}_sauvegarde_${today}.xlsx`);
    } catch (e) {
      console.error("exportDatabase error:", e);
      alert("Erreur lors de l'export. Réessayez.");
    } finally {
      setExporting(false);
    }
  };

  const isGerant = permissions?.is_gerant === true;

  const tabs = [
    { id: "general", label: "⚙️ Général", visible: true },
    { id: "company", label: "🏢 Entreprise", visible: true },
    { id: "technicians", label: "👨‍🔧 Techniciens", visible: isGerant },
    { id: "backup", label: "💾 Sauvegarde", visible: isGerant },
    { id: "logs", label: "📋 Logs", visible: isGerant },
  ];

  const visibleTabs = tabs.filter((tab) => tab.visible);

  const inputCls = "w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none focus:border-slate-500/60 focus:ring-2 focus:ring-slate-500/15 transition-all";
  const inputReadOnlyCls = "w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-gray-500 text-sm cursor-not-allowed";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5";

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-500 to-slate-600 rounded-2xl px-6 py-5 mb-6">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><Settings size={22} className="text-gray-400" /> Paramètres</h1>
            <p className="text-xs text-white/60 uppercase tracking-widest mt-1">Configuration de l'atelier</p>
          </div>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-4 text-sm border ${message.includes("✅") ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            {message}
          </div>
        )}

        {/* Onglets */}
        <div className="border-b border-white/10 mb-6">
          <nav className="flex gap-1 flex-wrap">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-4 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "text-slate-300 border-b-2 border-slate-400"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="bg-[#16161d] border border-white/5 rounded-2xl p-6">
          {/* Onglet Général */}
          {activeTab === "general" && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5">Informations générales</h2>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className={labelCls}>Nom du technicien</label>
                  <input type="text" value={technicianName} readOnly className={inputReadOnlyCls} />
                </div>
                <div>
                  <label className={labelCls}>Email connecté</label>
                  <input type="text" value={companyEmail} readOnly className={inputReadOnlyCls} />
                </div>
                <div>
                  <label className={labelCls}>Version</label>
                  <input type="text" value="MBX Réparations v2.0" readOnly className={inputReadOnlyCls} />
                </div>
              </div>
            </div>
          )}

          {/* Onglet Entreprise */}
          {activeTab === "company" && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Informations de l'entreprise</h2>
              {!isGerant && (
                <div className="mb-5 flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-orange-300">
                  🔒 Ces informations sont gérées par le gérant. Elles sont en lecture seule pour votre compte.
                </div>
              )}

              {/* Upload Logo */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                <label className={labelCls}>🖼️ Logo de l'entreprise</label>
                <div className="flex items-center gap-4 mt-2">
                  {logoPreview ? (
                    <div className="relative">
                      <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain border border-white/10 rounded-xl bg-white/5 p-1" />
                      {isGerant && (
                        <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center text-2xl">🔧</div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileChange}
                      disabled={uploading || !isGerant}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-500/15 file:text-slate-300 hover:file:bg-slate-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-600 mt-1">PNG, JPG ou JPEG. Max 2MB.</p>
                  </div>
                </div>
                {uploading && <div className="mt-2 text-sm text-slate-400">⏳ Téléchargement en cours...</div>}
              </div>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className={labelCls}>Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    className={isGerant ? inputCls : inputReadOnlyCls}
                    disabled={!isGerant}
                    placeholder="Votre entreprise"
                  />
                </div>
                <div>
                  <label className={labelCls}>Téléphone</label>
                  <input
                    type="tel"
                    value={settings.contact_phone}
                    onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                    className={isGerant ? inputCls : inputReadOnlyCls}
                    disabled={!isGerant}
                    placeholder="0612345678"
                  />
                </div>
                <div>
                  <label className={labelCls}>Email de contact</label>
                  <input
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                    className={isGerant ? inputCls : inputReadOnlyCls}
                    disabled={!isGerant}
                    placeholder="contact@entreprise.com"
                  />
                </div>
                <div>
                  <label className={labelCls}>Adresse</label>
                  <textarea
                    value={settings.contact_address}
                    onChange={(e) => setSettings({ ...settings, contact_address: e.target.value })}
                    className={isGerant ? inputCls : inputReadOnlyCls}
                    disabled={!isGerant}
                    rows={3}
                    placeholder="Adresse complète"
                  />
                </div>
                {isGerant && (
                  <button
                    onClick={saveSettings}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl text-sm font-semibold shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all disabled:opacity-50"
                  >
                    {loading ? "Enregistrement..." : "💾 Enregistrer"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Onglet Techniciens */}
          {activeTab === "technicians" && isGerant && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Gestion des techniciens</h2>
                <Link
                  href="/technicians"
                  className="px-4 py-2 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl text-sm font-semibold shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all"
                >
                  + Accéder à la gestion
                </Link>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                Gérez les techniciens, leurs codes d'accès et permissions d'accès aux différentes sections.
              </p>
              <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-slate-400">📋 {technicians.length} technicien(s) actif(s)</p>
              </div>
            </div>
          )}

          {/* Onglet Sauvegarde */}
          {activeTab === "backup" && isGerant && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Sauvegarde de la base</h2>
              <p className="text-sm text-gray-500 mb-5 max-w-lg">
                Téléchargez l&apos;intégralité des données de votre compte (clients et réparations)
                dans un fichier Excel. Utile pour conserver une copie de sauvegarde ou récupérer vos données.
              </p>
              <div className="p-5 bg-white/5 border border-white/10 rounded-xl max-w-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center text-2xl">📊</div>
                  <div>
                    <div className="text-white font-semibold text-sm">Export Excel</div>
                    <div className="text-xs text-gray-500">2 feuilles : Clients · Réparations</div>
                  </div>
                </div>
                <button
                  onClick={exportDatabase}
                  disabled={exporting}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {exporting ? "⏳ Export en cours…" : "⬇️ Télécharger ma base (Excel)"}
                </button>
              </div>
            </div>
          )}

          {/* Onglet Logs */}
          {activeTab === "logs" && isGerant && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Historique des actions</h2>
                <Link
                  href="/logs"
                  className="px-4 py-2 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl text-sm font-semibold shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all"
                >
                  📋 Voir tous les logs
                </Link>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                Consultez l'historique complet des connexions et actions effectuées par les techniciens.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
