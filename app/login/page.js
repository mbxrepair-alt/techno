"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { addLog } from "../../lib/logs";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempUser, setTempUser] = useState(null);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Vérifier si les cookies existent
        const hasCookie = document.cookie.includes("mbx_auth_token");
        if (hasCookie) {
          router.push("/dashboard");
        }
      }
    };
    checkUser();
  }, [router]);

  // Supprimer les cookies
  const clearCookies = () => {
    document.cookie = "mbx_auth_token=; path=/; max-age=0";
    document.cookie = "mbx_company_id=; path=/; max-age=0";
    document.cookie = "mbx_technician_name=; path=/; max-age=0";
    document.cookie = "mbx_technician_id=; path=/; max-age=0";
  };

  // Étape 1 : Connexion email/mot de passe
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    clearCookies();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Récupérer le nom de l'entreprise depuis la table profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_name")
          .eq("id", data.user.id)
          .single();
        
        setCompanyName(profile?.company_name || data.user.email?.split("@")[0]);
        setTempUser(data.user);
        setStep(2);
        setLoading(false);
      }
    } catch (err) {
      setError("Erreur: " + err.message);
      setLoading(false);
    }
  };

  // Étape 2 : Vérifier le code du technicien
  const handleCodeVerification = async (e) => {
    e.preventDefault();
    if (code.length !== 4) {
      setError("Code à 4 chiffres requis");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      // Chercher le technicien par son code
      const { data: tech, error: techError } = await supabase
        .from("technicians")
        .select("*")
        .eq("access_code", code)
        .eq("company_id", tempUser.id)
        .eq("is_active", true)
        .single();

      if (techError || !tech) {
        setError("Code invalide pour cette entreprise");
        setLoading(false);
        return;
      }

      // Stocker les permissions dans sessionStorage
      sessionStorage.setItem("technician_permissions", JSON.stringify({
        id: tech.id,
        name: tech.name,
        is_gerant: tech.is_gerant || false,
        can_access_repairs: tech.can_access_repairs || false,
        can_access_clients: tech.can_access_clients || false,
        can_access_factures: tech.can_access_factures || false,
        can_access_paiements: tech.can_access_paiements || false,
        can_access_statistiques: tech.can_access_statistiques || false,
        can_access_settings: tech.can_access_settings || false
      }));

      sessionStorage.setItem("technician_name", tech.name);
      sessionStorage.setItem("company_id", tempUser.id);

      // Créer les cookies pour le middleware
      document.cookie = `mbx_auth_token=${tech.id}; path=/; max-age=86400`;
      document.cookie = `mbx_company_id=${tempUser.id}; path=/; max-age=86400`;
      document.cookie = `mbx_technician_name=${encodeURIComponent(tech.name)}; path=/; max-age=86400`;
      document.cookie = `mbx_technician_id=${tech.id}; path=/; max-age=86400`;

      // Enregistrer la connexion dans les logs
      await addLog({
        action: "login",
        technicienId: tech.id,
        technicienName: tech.name,
        companyId: tempUser.id,
        details: {
          code_used: code,
          login_time: new Date().toISOString(),
          user_agent: typeof window !== "undefined" ? navigator.userAgent : "server"
        }
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Erreur: " + err.message);
      setLoading(false);
    }
  };

  // Revenir à l'étape 1
  const handleBack = () => {
    clearCookies();
    sessionStorage.removeItem("technician_permissions");
    sessionStorage.removeItem("technician_name");
    sessionStorage.removeItem("company_id");
    setStep(1);
    setCode("");
    setTempUser(null);
    supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MBX Réparations</h1>
          <p className="text-gray-500 mt-2">
            {step === 1 ? "Connexion entreprise" : `Bienvenue ${companyName}`}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleEmailLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 text-sm font-medium">📧 Email entreprise</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="entreprise@email.com"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">🔒 Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              {loading ? "Connexion..." : "Continuer"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeVerification}>
            <div className="mb-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-gray-600 text-sm">
                Connecté en tant que <strong>{tempUser?.email}</strong>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">🔑 Code technicien (4 chiffres)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                placeholder="0000"
                maxLength="4"
                required
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2">Entrez votre code personnel à 4 chiffres</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium mb-2"
            >
              {loading ? "Vérification..." : "Valider mon code"}
            </button>
            
            <button
              type="button"
              onClick={handleBack}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-700"
            >
              ← Se déconnecter
            </button>
          </form>
        )}
      </div>
    </div>
  );
}