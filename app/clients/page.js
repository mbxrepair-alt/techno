"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// Initialisation Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ton-projet.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "ta-clé-anon";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// ========== LAYOUT COMPLET AVEC MENU ==========
const Layout = ({ children }) => {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientSubmissions, setClientSubmissions] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserEmail(user.email);
        if (user.email === "mbxrepair@gmail.com") {
          setIsAdmin(true);
        }
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, company_name, logo_url")
          .eq("id", user.id)
          .single();
        
        if (profile?.company_name) {
          setCompanyName(profile.company_name);
        }
        if (profile?.logo_url) {
          setLogoUrl(profile.logo_url);
        }
        
        const { count, error } = await supabase
          .from("repairs")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", user.id)
          .eq("is_client_submitted", true);
        
        if (!error && count !== null) {
          setClientSubmissions(count);
        }
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const NavLink = ({ href, children, isAdmin }) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 flex items-center ${
        isAdmin ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );

  const MobileNavLink = ({ href, children, onClick }) => (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
    >
      {children}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo et nom de l'atelier */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <div className="relative w-10 h-10">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Logo MBXrepair"
                    width={40}
                    height={40}
                    className="object-contain rounded-lg"
                    priority
                    onError={() => setLogoUrl("")}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl">🔧</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {companyName || "Mon Atelier"}
                </h1>
              </div>
            </div>

            {/* Menu desktop */}
            <div className="hidden md:flex items-center space-x-1">
              <NavLink href="/dashboard">📊 Dashboard</NavLink>
              <NavLink href="/repairs">🔧 Réparations</NavLink>
              <NavLink href="/clients">👥 Clients</NavLink>
              <NavLink href="/historique">📜 Historique</NavLink>
              <NavLink href="/factures">💰 Factures</NavLink>
              <NavLink href="/paiements">💰 Paiements</NavLink>
              <NavLink href="/admin/client-submissions">
                📱 Appareils saisis
                {clientSubmissions > 0 && (
                  <span className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {clientSubmissions}
                  </span>
                )}
              </NavLink>
              <NavLink href="/client">🌍 Espace client</NavLink>
              {isAdmin && (
                <>
                  <NavLink href="/admin/licence" isAdmin>🔐 Licence</NavLink>
                  <NavLink href="/admin/users" isAdmin>👥 Utilisateurs</NavLink>
                </>
              )}
            </div>

            {/* Profil + Paramètres + Déconnexion */}
            <div className="hidden md:flex items-center space-x-2">
              <Link href="/settings" className="flex items-center space-x-1 px-3 py-1 rounded-lg text-gray-600 hover:bg-gray-100 transition">
                <span>⚙️</span>
                <span className="text-sm">Paramètres</span>
              </Link>
              <div className="flex flex-col items-end">
                <button onClick={handleLogout} className="flex items-center space-x-1 px-3 py-1 rounded-lg text-red-600 hover:bg-red-50 transition">
                  <span>🚪</span>
                  <span className="text-sm font-medium">Déconnexion</span>
                </button>
                <span className="text-xs text-gray-400 mt-0.5">{userEmail || ""}</span>
              </div>
            </div>

            {/* Bouton menu mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Menu mobile */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-1">
              <MobileNavLink href="/dashboard" onClick={() => setMobileMenuOpen(false)}>📊 Dashboard</MobileNavLink>
              <MobileNavLink href="/repairs" onClick={() => setMobileMenuOpen(false)}>🔧 Réparations</MobileNavLink>
              <MobileNavLink href="/clients" onClick={() => setMobileMenuOpen(false)}>👥 Clients</MobileNavLink>
              <MobileNavLink href="/historique" onClick={() => setMobileMenuOpen(false)}>📜 Historique</MobileNavLink>
              <MobileNavLink href="/factures" onClick={() => setMobileMenuOpen(false)}>💰 Factures</MobileNavLink>
              <MobileNavLink href="/paiements" onClick={() => setMobileMenuOpen(false)}>💰 Paiements</MobileNavLink>
              <MobileNavLink href="/admin/client-submissions" onClick={() => setMobileMenuOpen(false)}>
                📱 Appareils saisis
                {clientSubmissions > 0 && (
                  <span className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {clientSubmissions}
                  </span>
                )}
              </MobileNavLink>
              <MobileNavLink href="/client" onClick={() => setMobileMenuOpen(false)}>🌍 Espace client</MobileNavLink>
              {isAdmin && (
                <>
                  <MobileNavLink href="/admin/licence" onClick={() => setMobileMenuOpen(false)}>🔐 Licence</MobileNavLink>
                  <MobileNavLink href="/admin/users" onClick={() => setMobileMenuOpen(false)}>👥 Utilisateurs</MobileNavLink>
                </>
              )}
              <MobileNavLink href="/settings" onClick={() => setMobileMenuOpen(false)}>⚙️ Paramètres</MobileNavLink>
              <div className="pt-4 border-t mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition text-left">
                      🚪 Déconnexion
                    </button>
                    <span className="text-xs text-gray-400 mt-0.5 px-1">{userEmail || ""}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
        {children}
      </main>
    </div>
  );
};

// ========== PAGE CLIENTS ==========
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
  
  // États pour la suppression avec mot de passe
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
    client_code: ""
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

  // Fonction pour vérifier le mot de passe et supprimer
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
        password: passwordToDelete
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
        const suggestions = data.features.map(feature => ({
          id: feature.properties.id,
          label: feature.properties.label,
          address: feature.properties.label
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
    const cleanSiret = siret.replace(/\s/g, '');
    
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
          
          const companyName = info.nom_commercial || 
                             info.enseigne || 
                             uniteLegale.denomination ||
                             "Entreprise";
          
          const apeCode = uniteLegale.activite_principale || "";
          const address = info.adresse_etablissement || {};
          
          const formattedAddress = `${address.numero_voie || ''} ${address.type_voie || ''} ${address.libelle_voie || ''}`.trim();
          const postalCode = address.code_postal || "";
          const city = address.libelle_commune || "";
          
          setSiretInfo({
            nom: companyName,
            adresse: formattedAddress,
            code_postal: postalCode,
            ville: city,
            ape_code: apeCode
          });
          
          setFormData(prev => ({
            ...prev,
            companyName: companyName,
            apeCode: apeCode,
            address: `${formattedAddress} ${postalCode} ${city}`.trim()
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
    if (letters.length < 3) letters = letters.padEnd(3, 'X');
    
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
        type: "pro"
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
        type: "particulier"
      };
    }

    const clientCode = await generateUniqueCode(displayName);

    const { error } = await supabase
      .from("clients")
      .insert([{
        ...fullData,
        client_code: clientCode,
        user_id: user.id,
        default_tax_rate: formData.type === "pro" ? 20 : 0
      }]);

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
        type: "pro"
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
        type: "particulier"
      };
    }

    const { error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", selectedClient.id);

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
      client_code: ""
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
        address: client.address || ""
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
        address: client.address || ""
      });
    }
    setShowEditModal(true);
  };

  const filteredClients = clients.filter(client => {
    if (searchTerm && !client.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !client.client_code?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterType !== "all" && client.type !== filterType) {
      return false;
    }
    return true;
  });

  const stats = {
    total: clients.length,
    pro: clients.filter(c => c.type === "pro").length,
    particulier: clients.filter(c => c.type === "particulier").length,
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {message.text && (
          <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg z-50 text-white ${message.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">👥 Clients</h1>
            <p className="text-sm text-gray-500">Gérez vos clients et leurs codes d'accès</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition"
          >
            + Nouveau client
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-500 rounded-xl p-4 text-white">
            <div className="text-sm">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-indigo-500 rounded-xl p-4 text-white">
            <div className="text-sm">Professionnels</div>
            <div className="text-2xl font-bold">{stats.pro}</div>
          </div>
          <div className="bg-green-500 rounded-xl p-4 text-white">
            <div className="text-sm">Particuliers</div>
            <div className="text-2xl font-bold">{stats.particulier}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="🔍 Rechercher par nom ou code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="p-2 border rounded-lg"
            >
              <option value="all">Tous</option>
              <option value="pro">Professionnels</option>
              <option value="particulier">Particuliers</option>
            </select>
          </div>
        </div>

        {/* TABLEAU */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">🔑 Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">👤 Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">✉️ Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">📞 Téléphone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">🏷️ Type</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">⚡ Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                      Aucun client trouvé
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{client.client_code}</code>
                          <button onClick={() => copyClientCode(client.client_code)} className="text-green-600 hover:text-green-800 transition" title="Copier le code">📋</button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{client.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{client.email !== "NC" ? client.email : "-"}</td>
                      <td className="px-4 py-3 text-sm">{client.phone !== "NC" ? client.phone : "-"}</td>
                      <td className="px-4 py-3">
                        {client.type === "pro" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">🏢 Pro</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">👤 Particulier</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openEditModal(client)} className="text-blue-600 hover:text-blue-800 transition mx-1 text-lg" title="Modifier">✏️</button>
                        <button onClick={() => openDeleteModal(client)} className="text-red-600 hover:text-red-800 transition mx-1 text-lg" title="Supprimer">🗑️</button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">➕ Nouveau client</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <form onSubmit={handleAddClient} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de client *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="particulier" checked={formData.type === "particulier"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-4 h-4" />
                    <span>👤 Particulier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="pro" checked={formData.type === "pro"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-4 h-4" />
                    <span>🏢 Professionnel</span>
                  </label>
                </div>
              </div>

              {formData.type === "particulier" && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Civilité</label><select value={formData.civility} onChange={(e) => setFormData({ ...formData, civility: e.target.value })} className="w-full p-2 border rounded-lg"><option value="mr">M.</option><option value="mme">Mme</option><option value="mlle">Mlle</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label><input type="text" required className="w-full p-2 border rounded-lg" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label><input type="text" required className="w-full p-2 border rounded-lg" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} /></div>
                </div>
              )}

              {formData.type === "pro" && (
                <div className="space-y-4 border-t pt-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Société *</label><input type="text" required className="w-full p-2 border rounded-lg" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Numéro Siret</label><input type="text" placeholder="14 chiffres" className="w-full p-2 border rounded-lg" value={formData.siret} onChange={(e) => { setFormData({ ...formData, siret: e.target.value }); setSiretError(""); setSiretInfo(null); }} onBlur={() => formData.siret && formData.siret.length === 14 && validateSiret(formData.siret)} maxLength="14" />
                  {loadingSiret && <p className="text-sm text-gray-500 mt-1">🔍 Vérification...</p>}{siretError && <p className="text-sm text-red-600 mt-1">⚠️ {siretError}</p>}{siretInfo && (<div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="font-semibold text-green-800">✅ {siretInfo.nom}</p><p className="text-sm text-gray-600">{siretInfo.adresse}</p></div>)}</div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Code APE</label><input type="text" className="w-full p-2 border rounded-lg bg-gray-50" value={formData.apeCode} onChange={(e) => setFormData({ ...formData, apeCode: e.target.value })} placeholder="Auto-rempli" readOnly /></div>
                </div>
              )}

              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" required className="w-full p-2 border rounded-lg" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone fixe</label><input type="tel" className="w-full p-2 border rounded-lg" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone portable</label><input type="tel" className="w-full p-2 border rounded-lg" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} /></div>
                <div className="relative"><label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label><input type="text" placeholder="Saisissez votre adresse" className="w-full p-2 border rounded-lg" value={formData.address} onChange={(e) => { setFormData({ ...formData, address: e.target.value }); searchAddress(e.target.value); }} />
                {showAddressSuggestions && addressSuggestions.length > 0 && (<div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">{addressSuggestions.map((suggestion) => (<button key={suggestion.id} type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => selectAddress(suggestion)}>{suggestion.label}</button>))}</div>)}</div>
              </div>

              <div className="flex gap-3 pt-4"><button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Ajouter le client</button><button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Annuler</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION CLIENT */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">✏️ Modifier {selectedClient.name}</h2><button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button></div>
            <form onSubmit={handleEditClient} className="space-y-6">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Type de client</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="particulier" checked={formData.type === "particulier"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-4 h-4" /><span>👤 Particulier</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="pro" checked={formData.type === "pro"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-4 h-4" /><span>🏢 Professionnel</span></label></div></div>
              {formData.type === "particulier" && (<div className="space-y-4 border-t pt-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Civilité</label><select value={formData.civility} onChange={(e) => setFormData({ ...formData, civility: e.target.value })} className="w-full p-2 border rounded-lg"><option value="mr">M.</option><option value="mme">Mme</option><option value="mlle">Mlle</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label><input type="text" required className="w-full p-2 border rounded-lg" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} /></div></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label><input type="text" required className="w-full p-2 border rounded-lg" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} /></div></div>)}
              {formData.type === "pro" && (<div className="space-y-4 border-t pt-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Société *</label><input type="text" required className="w-full p-2 border rounded-lg" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Numéro Siret</label><input type="text" className="w-full p-2 border rounded-lg" value={formData.siret} onChange={(e) => setFormData({ ...formData, siret: e.target.value })} maxLength="14" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Code APE</label><input type="text" className="w-full p-2 border rounded-lg bg-gray-50" value={formData.apeCode} onChange={(e) => setFormData({ ...formData, apeCode: e.target.value })} /></div></div>)}
              <div className="space-y-4 border-t pt-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" required className="w-full p-2 border rounded-lg" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone fixe</label><input type="tel" className="w-full p-2 border rounded-lg" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone portable</label><input type="tel" className="w-full p-2 border rounded-lg" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} /></div><div className="relative"><label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label><input type="text" className="w-full p-2 border rounded-lg" value={formData.address} onChange={(e) => { setFormData({ ...formData, address: e.target.value }); searchAddress(e.target.value); }} />
              {showAddressSuggestions && addressSuggestions.length > 0 && (<div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">{addressSuggestions.map((suggestion) => (<button key={suggestion.id} type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => selectAddress(suggestion)}>{suggestion.label}</button>))}</div>)}</div></div>
              <div className="flex gap-3 pt-4"><button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Enregistrer</button><button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Annuler</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION MOT DE PASSE POUR SUPPRESSION */}
      {showPasswordModal && clientToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-600">⚠️ Suppression client</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="space-y-4">
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="text-red-700 text-sm">Vous êtes sur le point de supprimer définitivement :</p>
                <p className="font-bold text-gray-800 mt-1">{clientToDelete.name}</p>
                <p className="text-xs text-gray-500 mt-1">Code: {clientToDelete.client_code}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🔐 Mot de passe du compte</label>
                <input
                  type="password"
                  value={passwordToDelete}
                  onChange={(e) => setPasswordToDelete(e.target.value)}
                  placeholder="Entrez votre mot de passe"
                  className="w-full border rounded-lg p-2 text-sm"
                  autoFocus
                  onKeyPress={(e) => e.key === "Enter" && verifyPasswordAndDelete()}
                />
                <p className="text-xs text-gray-400 mt-1">La suppression est irréversible. Veuillez confirmer avec votre mot de passe.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={verifyPasswordAndDelete} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition">
                  🗑️ Confirmer la suppression
                </button>
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300 transition">
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