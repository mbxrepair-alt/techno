"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [siretError, setSiretError] = useState("");
  const [siretInfo, setSiretInfo] = useState(null);
  const [loadingSiret, setLoadingSiret] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordToDelete, setPasswordToDelete] = useState("");
  const [clientToDelete, setClientToDelete] = useState(null);

  const [filterType, setFilterType] = useState("all");

  const [formData, setFormData] = useState({
    civility: "mr",
    lastName: "",
    firstName: "",
    email: "",
    phone: "",
    mobile: "",
    address: "",
    companyName: "",
    siret: "",
    apeCode: "",
    type: "particulier",
    client_code: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Erreur:", error);
      showMessage("Erreur chargement clients", "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyPasswordAndDelete = async () => {
    if (!passwordToDelete) {
      alert("Veuillez entrer votre mot de passe");
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        alert("Utilisateur non connecté");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordToDelete,
      });

      if (error) {
        alert("❌ Mot de passe incorrect");
        setPasswordToDelete("");
        return;
      }

      if (clientToDelete) {
        const { error: deleteError } = await supabase
          .from("clients")
          .delete()
          .eq("id", clientToDelete.id);

        if (deleteError) {
          showMessage("Erreur: " + deleteError.message, "error");
        } else {
          showMessage(`✅ Client "${clientToDelete.name}" supprimé`, "success");
          loadClients();
        }
      }

      setShowPasswordModal(false);
      setPasswordToDelete("");
      setClientToDelete(null);
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors de la vérification");
    }
  };

  const openDeleteModal = (client) => {
    setClientToDelete(client);
    setShowPasswordModal(true);
    setPasswordToDelete("");
  };

  const searchAddress = async (input) => {
    if (!input || input.trim().length < 4) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    try {
      const encodedQuery = encodeURIComponent(input.trim());
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodedQuery}&limit=5`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data && data.features && Array.isArray(data.features)) {
        const suggestions = data.features.map((feature) => ({
          id: feature.properties.id,
          label: feature.properties.label,
          address: feature.properties.label,
        }));
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(suggestions.length > 0);
      } else {
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
      }
    } catch (error) {
      console.error("Erreur recherche adresse:", error);
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    }
  };

  const selectAddress = (suggestion) => {
    setFormData({ ...formData, address: suggestion.address });
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };

  const validateSiret = async (siret) => {
    const cleanSiret = siret.replace(/\s/g, "");

    if (!cleanSiret || cleanSiret.length !== 14) {
      setSiretError("Le SIRET doit contenir 14 chiffres");
      setSiretInfo(null);
      return false;
    }

    if (!/^\d{14}$/.test(cleanSiret)) {
      setSiretError("Le SIRET ne doit contenir que des chiffres");
      setSiretInfo(null);
      return false;
    }

    setLoadingSiret(true);
    setSiretError("");

    try {
      const response = await fetch(
        `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${cleanSiret}`
      );

      if (response.ok) {
        const data = await response.json();

        if (data && data.etablissement) {
          const info = data.etablissement;
          const uniteLegale = info.unite_legale || {};

          const companyName =
            info.nom_commercial || info.enseigne || uniteLegale.denomination || "Entreprise";

          const apeCode = uniteLegale.activite_principale || "";
          const address = info.adresse_etablissement || {};

          const formattedAddress =
            `${address.numero_voie || ""} ${address.type_voie || ""} ${address.libelle_voie || ""}`.trim();
          const postalCode = address.code_postal || "";
          const city = address.libelle_commune || "";

          setSiretInfo({
            nom: companyName,
            adresse: formattedAddress,
            code_postal: postalCode,
            ville: city,
            ape_code: apeCode,
          });

          setFormData((prev) => ({
            ...prev,
            companyName: companyName,
            apeCode: apeCode,
            address: `${formattedAddress} ${postalCode} ${city}`.trim(),
          }));

          showMessage(`✅ SIRET valide : ${companyName}`, "success");
          return true;
        }
      }

      setSiretError("SIRET non trouvé");
      setSiretInfo(null);
      return false;
    } catch (error) {
      console.error("Erreur validation SIRET:", error);
      setSiretError("Service indisponible, réessayez");
      setSiretInfo(null);
      return false;
    } finally {
      setLoadingSiret(false);
    }
  };

  const generateUniqueCode = async (name) => {
    let letters = name.substring(0, 3).toUpperCase();
    if (letters.length < 3) letters = letters.padEnd(3, "X");

    let code = null;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      const numbers = Math.floor(100000 + Math.random() * 900000).toString();
      code = `${letters}${numbers}`;

      const { data: existing } = await supabase
        .from("clients")
        .select("client_code")
        .eq("client_code", code)
        .maybeSingle();

      if (!existing) isUnique = true;
      attempts++;
    }
    return code;
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    const user = await getCurrentUser();
    if (!user) return;

    if (formData.type === "pro" && (!formData.companyName || formData.companyName.trim() === "")) {
      showMessage("Le nom de la société est requis", "error");
      return;
    }

    if (formData.type === "particulier" && (!formData.lastName || !formData.firstName)) {
      showMessage("Le nom et prénom sont requis", "error");
      return;
    }

    if (formData.type === "pro" && formData.siret && formData.siret.length === 14) {
      const isValid = await validateSiret(formData.siret);
      if (!isValid) {
        showMessage("SIRET invalide", "error");
        return;
      }
    }

    let displayName = "";
    let fullData = {};

    if (formData.type === "pro") {
      displayName = formData.companyName;
      fullData = {
        name: formData.companyName,
        company_name: formData.companyName,
        siret: formData.siret || null,
        ape_code: formData.apeCode || null,
        civility: null,
        first_name: null,
        last_name: null,
        phone: formData.phone || "NC",
        mobile: formData.mobile || "NC",
        email: formData.email || "NC",
        address: formData.address || "",
        type: "pro",
      };
    } else {
      displayName = `${formData.firstName} ${formData.lastName}`.trim();
      fullData = {
        name: displayName,
        company_name: null,
        siret: null,
        ape_code: null,
        civility: formData.civility,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone || "NC",
        mobile: formData.mobile || "NC",
        email: formData.email || "NC",
        address: formData.address || "",
        type: "particulier",
      };
    }

    const clientCode = await generateUniqueCode(displayName);

    const { error } = await supabase.from("clients").insert([
      {
        ...fullData,
        client_code: clientCode,
        user_id: user.id,
        default_tax_rate: formData.type === "pro" ? 20 : 0,
      },
    ]);

    if (error) {
      showMessage("Erreur: " + error.message, "error");
    } else {
      showMessage(`✅ Client ajouté - Code: ${clientCode}`, "success");
      setShowAddModal(false);
      resetForm();
      loadClients();
    }
  };

  const handleEditClient = async (e) => {
    e.preventDefault();
    const user = await getCurrentUser();
    if (!user || !selectedClient) return;

    let displayName = "";
    let updateData = {};

    if (formData.type === "pro") {
      displayName = formData.companyName;
      updateData = {
        name: formData.companyName,
        company_name: formData.companyName,
        siret: formData.siret || null,
        ape_code: formData.apeCode || null,
        phone: formData.phone || "NC",
        mobile: formData.mobile || "NC",
        email: formData.email || "NC",
        address: formData.address || "",
        type: "pro",
      };
    } else {
      displayName = `${formData.firstName} ${formData.lastName}`.trim();
      updateData = {
        name: displayName,
        company_name: null,
        siret: null,
        ape_code: null,
        civility: formData.civility,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone || "NC",
        mobile: formData.mobile || "NC",
        email: formData.email || "NC",
        address: formData.address || "",
        type: "particulier",
      };
    }

    const { error } = await supabase.from("clients").update(updateData).eq("id", selectedClient.id);

    if (error) {
      showMessage("Erreur: " + error.message, "error");
    } else {
      showMessage("✅ Client modifié", "success");
      setShowEditModal(false);
      setSelectedClient(null);
      resetForm();
      loadClients();
    }
  };

  const copyClientCode = (code) => {
    navigator.clipboard.writeText(code);
    showMessage(`Code ${code} copié !`, "success");
  };

  const resetForm = () => {
    setFormData({
      civility: "mr",
      lastName: "",
      firstName: "",
      email: "",
      phone: "",
      mobile: "",
      address: "",
      companyName: "",
      siret: "",
      apeCode: "",
      type: "particulier",
      client_code: "",
    });
    setSiretInfo(null);
    setSiretError("");
  };

  const openEditModal = (client) => {
    setSelectedClient(client);
    if (client.type === "pro") {
      setFormData({
        ...formData,
        type: "pro",
        companyName: client.company_name || client.name,
        siret: client.siret || "",
        apeCode: client.ape_code || "",
        email: client.email !== "NC" ? client.email : "",
        phone: client.phone !== "NC" ? client.phone : "",
        mobile: client.mobile !== "NC" ? client.mobile : "",
        address: client.address || "",
      });
    } else {
      setFormData({
        ...formData,
        type: "particulier",
        civility: client.civility || "mr",
        firstName: client.first_name || "",
        lastName: client.last_name || "",
        email: client.email !== "NC" ? client.email : "",
        phone: client.phone !== "NC" ? client.phone : "",
        mobile: client.mobile !== "NC" ? client.mobile : "",
        address: client.address || "",
      });
    }
    setShowEditModal(true);
  };

  const filteredClients = clients.filter((client) => {
    if (
      searchTerm &&
      !client.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !client.client_code?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    if (filterType !== "all" && client.type !== filterType) {
      return false;
    }
    return true;
  });

  const stats = {
    total: clients.length,
    pro: clients.filter((c) => c.type === "pro").length,
    particulier: clients.filter((c) => c.type === "particulier").length,
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </Layout>
    );
  }

  const inputCls = "w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 transition-all duration-200";
  const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <Layout>
      <div className="w-full">
        {message.text && (
          <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg z-50 text-sm font-semibold ${message.type === "error" ? "bg-red-500/20 border border-red-500/30 text-red-400" : "bg-green-500/20 border border-green-500/30 text-green-400"}`}>
            {message.text}
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2"><Users size={18} className="text-sky-400" /> Clients</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gérez vos clients et codes d'accès</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-all active:scale-95"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Nouveau client</span>
          </button>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#16161d] border border-emerald-500/20 rounded-2xl p-4 text-white">
            <div className="text-xs font-medium text-white/50 uppercase tracking-wider">Total</div>
            <div className="text-3xl font-black mt-1 text-emerald-400">{stats.total}</div>
          </div>
          <div className="bg-[#16161d] border border-blue-500/20 rounded-2xl p-4 text-white">
            <div className="text-xs font-medium text-white/50 uppercase tracking-wider">Professionnels</div>
            <div className="text-3xl font-black mt-1 text-blue-400">{stats.pro}</div>
          </div>
          <div className="bg-[#16161d] border border-cyan-500/20 rounded-2xl p-4 text-white">
            <div className="text-xs font-medium text-white/50 uppercase tracking-wider">Particuliers</div>
            <div className="text-3xl font-black mt-1 text-cyan-400">{stats.particulier}</div>
          </div>
        </div>

        {/* SEARCH / FILTER */}
        <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4 mb-5 flex gap-3">
          <input
            type="text"
            placeholder="Rechercher par nom ou code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`flex-1 ${inputCls}`}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 transition-all"
          >
            <option value="all">Tous</option>
            <option value="pro">Professionnels</option>
            <option value="particulier">Particuliers</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="bg-[#16161d] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-emerald-500/10 border-b border-white/5">
                  <th className="px-4 py-3 text-left text-xs font-bold text-emerald-400 uppercase tracking-widest">🔑 Code</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-emerald-400 uppercase tracking-widest">👤 Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-emerald-400 uppercase tracking-widest">✉️ Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-emerald-400 uppercase tracking-widest">📞 Téléphone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-emerald-400 uppercase tracking-widest">🏷️ Type</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-emerald-400 uppercase tracking-widest">⚡ Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">Aucun client trouvé</td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-white/5 transition-colors duration-150 cursor-pointer" onClick={() => router.push(`/clients/${client.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-xs font-mono">{client.client_code}</code>
                          <button onClick={(e) => { e.stopPropagation(); copyClientCode(client.client_code); }} className="text-gray-500 hover:text-emerald-400 transition-colors" title="Copier">📋</button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-white text-sm">{client.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{client.email !== "NC" ? client.email : "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{client.phone !== "NC" ? client.phone : "-"}</td>
                      <td className="px-4 py-3">
                        {client.type === "pro" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium">🏢 Pro</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">👤 Particulier</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(client); }} className="text-gray-400 hover:text-emerald-400 transition-colors mx-1 text-lg" title="Modifier">✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); openDeleteModal(client); }} className="text-gray-400 hover:text-red-400 transition-colors mx-1 text-lg" title="Supprimer">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL AJOUT CLIENT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#16161d] border border-white/10 border-t-2 border-t-emerald-500 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-black text-white">➕ Nouveau client</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
            </div>
            <form onSubmit={handleAddClient} className="space-y-5">
              <div>
                <label className={labelCls}>Type de client *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input type="radio" value="particulier" checked={formData.type === "particulier"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-4 h-4 accent-emerald-500" />
                    <span>👤 Particulier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input type="radio" value="pro" checked={formData.type === "pro"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-4 h-4 accent-emerald-500" />
                    <span>🏢 Professionnel</span>
                  </label>
                </div>
              </div>

              {formData.type === "particulier" && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Civilité</label>
                      <select value={formData.civility} onChange={(e) => setFormData({ ...formData, civility: e.target.value })} className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/60 w-full">
                        <option value="mr">M.</option>
                        <option value="mme">Mme</option>
                        <option value="mlle">Mlle</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Prénom *</label>
                      <input type="text" required className={inputCls} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Nom *</label>
                    <input type="text" required className={inputCls} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                  </div>
                </div>
              )}

              {formData.type === "pro" && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div>
                    <label className={labelCls}>Société *</label>
                    <input type="text" required className={inputCls} value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Numéro Siret</label>
                    <input type="text" placeholder="14 chiffres" className={inputCls} value={formData.siret}
                      onChange={(e) => { setFormData({ ...formData, siret: e.target.value }); setSiretError(""); setSiretInfo(null); }}
                      onBlur={() => formData.siret && formData.siret.length === 14 && validateSiret(formData.siret)}
                      maxLength={14}
                    />
                    {loadingSiret && <p className="text-xs text-gray-500 mt-1">🔍 Vérification...</p>}
                    {siretError && <p className="text-xs text-red-400 mt-1">⚠️ {siretError}</p>}
                    {siretInfo && (
                      <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="font-semibold text-emerald-400 text-sm">✅ {siretInfo.nom}</p>
                        <p className="text-xs text-gray-400">{siretInfo.adresse}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Code APE</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-500 text-sm outline-none" value={formData.apeCode} onChange={(e) => setFormData({ ...formData, apeCode: e.target.value })} placeholder="Auto-rempli" readOnly />
                  </div>
                </div>
              )}

              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input type="email" required className={inputCls} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Téléphone fixe</label>
                    <input type="tel" className={inputCls} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Téléphone portable</label>
                  <input type="tel" className={inputCls} value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                </div>
                <div className="relative">
                  <label className={labelCls}>Adresse</label>
                  <input type="text" placeholder="Saisissez votre adresse" className={inputCls} value={formData.address}
                    onChange={(e) => { setFormData({ ...formData, address: e.target.value }); searchAddress(e.target.value); }}
                  />
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#16161d] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {addressSuggestions.map((suggestion) => (
                        <button key={suggestion.id} type="button" className="w-full text-left px-4 py-2.5 hover:bg-emerald-500/10 text-sm text-gray-300 hover:text-white transition-colors" onClick={() => selectAddress(suggestion)}>
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all duration-150">
                  Ajouter le client
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-white/10 text-gray-300 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all duration-150">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION CLIENT */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-[#16161d] border border-white/10 border-t-2 border-t-emerald-500 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-black text-white">✏️ Modifier {selectedClient.name}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
            </div>
            <form onSubmit={handleEditClient} className="space-y-5">
              <div>
                <label className={labelCls}>Type de client</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input type="radio" value="particulier" checked={formData.type === "particulier"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-4 h-4 accent-emerald-500" />
                    <span>👤 Particulier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input type="radio" value="pro" checked={formData.type === "pro"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-4 h-4 accent-emerald-500" />
                    <span>🏢 Professionnel</span>
                  </label>
                </div>
              </div>
              {formData.type === "particulier" && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Civilité</label>
                      <select value={formData.civility} onChange={(e) => setFormData({ ...formData, civility: e.target.value })} className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/60 w-full">
                        <option value="mr">M.</option>
                        <option value="mme">Mme</option>
                        <option value="mlle">Mlle</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Prénom *</label>
                      <input type="text" required className={inputCls} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Nom *</label>
                    <input type="text" required className={inputCls} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                  </div>
                </div>
              )}
              {formData.type === "pro" && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div>
                    <label className={labelCls}>Société *</label>
                    <input type="text" required className={inputCls} value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Numéro Siret</label>
                    <input type="text" className={inputCls} value={formData.siret} onChange={(e) => setFormData({ ...formData, siret: e.target.value })} maxLength={14} />
                  </div>
                  <div>
                    <label className={labelCls}>Code APE</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-500 text-sm outline-none" value={formData.apeCode} onChange={(e) => setFormData({ ...formData, apeCode: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input type="email" required className={inputCls} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Téléphone fixe</label>
                    <input type="tel" className={inputCls} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Téléphone portable</label>
                  <input type="tel" className={inputCls} value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                </div>
                <div className="relative">
                  <label className={labelCls}>Adresse</label>
                  <input type="text" className={inputCls} value={formData.address}
                    onChange={(e) => { setFormData({ ...formData, address: e.target.value }); searchAddress(e.target.value); }}
                  />
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#16161d] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {addressSuggestions.map((suggestion) => (
                        <button key={suggestion.id} type="button" className="w-full text-left px-4 py-2.5 hover:bg-emerald-500/10 text-sm text-gray-300 hover:text-white transition-colors" onClick={() => selectAddress(suggestion)}>
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all duration-150">
                  Enregistrer
                </button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-white/10 text-gray-300 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all duration-150">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION */}
      {showPasswordModal && clientToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#16161d] border border-white/10 border-t-2 border-t-red-500 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-black text-red-400">⚠️ Suppression client</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-500 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
            </div>
            <div className="space-y-4">
              <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <p className="text-red-400 text-sm">Vous êtes sur le point de supprimer définitivement :</p>
                <p className="font-bold text-white mt-1">{clientToDelete.name}</p>
                <p className="text-xs text-gray-500 mt-1">Code: {clientToDelete.client_code}</p>
              </div>
              <div>
                <label className={labelCls}>🔐 Mot de passe du compte</label>
                <input type="password" value={passwordToDelete} onChange={(e) => setPasswordToDelete(e.target.value)} placeholder="Entrez votre mot de passe" className={inputCls} autoFocus onKeyPress={(e) => e.key === "Enter" && verifyPasswordAndDelete()} />
                <p className="text-xs text-gray-500 mt-1">La suppression est irréversible. Veuillez confirmer avec votre mot de passe.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={verifyPasswordAndDelete} className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all duration-150">
                  🗑️ Confirmer
                </button>
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 bg-white/10 text-gray-300 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all duration-150">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
