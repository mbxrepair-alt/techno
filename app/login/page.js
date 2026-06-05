"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { addLog } from "../../lib/logs";
import Link from "next/link";

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
        const hasCookie = document.cookie.includes("mbx_auth_token");
        if (hasCookie) {
          router.push("/dashboard");
        }
      }
    };
    checkUser();
  }, [router]);

  const clearCookies = () => {
    document.cookie = "mbx_auth_token=; path=/; max-age=0";
    document.cookie = "mbx_company_id=; path=/; max-age=0";
    document.cookie = "mbx_technician_name=; path=/; max-age=0";
    document.cookie = "mbx_technician_id=; path=/; max-age=0";
  };

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

  const handleCodeVerification = async (e) => {
    e.preventDefault();
    if (code.length !== 4) {
      setError("Code à 4 chiffres requis");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
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

      document.cookie = `mbx_auth_token=${tech.id}; path=/; max-age=86400`;
      document.cookie = `mbx_company_id=${tempUser.id}; path=/; max-age=86400`;
      document.cookie = `mbx_technician_name=${encodeURIComponent(tech.name)}; path=/; max-age=86400`;
      document.cookie = `mbx_technician_id=${tech.id}; path=/; max-age=86400`;

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
    <div className="min-h-screen bg-black">
      
      {/* HEADER NEON */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-2xl border-b border-orange-500/40 shadow-[0_0_50px_rgba(249,115,22,0.2)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
              <div className="relative">
                <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 opacity-75 group-hover:opacity-100 blur-md"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden">
                  <img src="/logo.png" alt="MBX Logo" className="w-full h-full object-cover rounded-xl scale-105" />
                </div>
              </div>
              <div className="leading-tight">
                <span className="text-white font-black text-2xl tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">MBX</span>
                <span className="text-orange-400 text-[10px] block -mt-1 font-bold tracking-[0.2em] drop-shadow-[0_0_4px_rgba(249,115,22,0.8)]">RÉPARATIONS</span>
              </div>
            </div>

            <Link
              href="/"
              className="relative group/btn flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-sm font-bold tracking-wider transition-all duration-300 shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:shadow-[0_0_40px_rgba(249,115,22,0.7)] hover:scale-105 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-lg">🏠</span>
                <span>ACCUEIL</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* FORMULAIRE DE CONNEXION NEON */}
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Effets de fond néon */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] animate-pulse"></div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="relative">
            {/* Cadre néon extérieur */}
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-2xl blur-xl opacity-70"></div>
            
            <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl p-8 border border-orange-500/30 shadow-2xl">
              <div className="text-center mb-8">
                <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <div className="absolute -inset-1 bg-orange-500 rounded-full blur-md opacity-50"></div>
                  <span className="relative text-3xl">🔧</span>
                </div>
                <h1 className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">ESPACE PRO</h1>
                <p className="text-orange-400 text-sm mt-2">
                  {step === 1 ? "Connexion à l'atelier" : `Bienvenue ${companyName}`}
                </p>
              </div>
              
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-lg mb-4 text-sm">
                  ❌ {error}
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleEmailLogin} className="space-y-5">
                  <div>
                    <label className="block text-orange-400 mb-2 text-sm font-medium drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]">📧 Email entreprise</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-orange-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                      placeholder="entreprise@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-orange-400 mb-2 text-sm font-medium drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]">🔒 Mot de passe</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-orange-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] hover:scale-[1.02] disabled:opacity-50"
                  >
                    {loading ? "⏳ Connexion..." : "🚀 CONTINUER"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCodeVerification} className="space-y-5">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-500/50">
                      <span className="text-2xl">✅</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Connecté en tant que <strong className="text-orange-400">{tempUser?.email}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-orange-400 mb-2 text-sm font-medium text-center drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]">🔑 Code technicien (4 chiffres)</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                      className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] bg-gray-900/50 border border-orange-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                      placeholder="0000"
                      maxLength="4"
                      required
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 text-center mt-2">Entrez votre code personnel à 4 chiffres</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] hover:scale-[1.02] disabled:opacity-50"
                  >
                    {loading ? "⏳ Vérification..." : "🔓 VALIDER"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full text-gray-400 text-sm py-2 hover:text-orange-400 transition"
                  >
                    ← Se déconnecter
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}