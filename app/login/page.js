"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Veuillez entrer votre email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      setTimeout(() => {
        setShowReset(false);
        setResetSent(false);
        setResetEmail("");
      }, 3000);
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* ========== FOND NEON ========== */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black"></div>
      
      {/* Grille de fond lumineuse */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Effet de lumière néon centrale */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/15 rounded-full blur-[100px] animate-pulse"></div>
      
      {/* Effet de faisceaux lumineux */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-[80px] animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-orange-600/20 rounded-full blur-[80px] animate-pulse delay-1000"></div>
      </div>
      
      {/* Lignes néon décoratives */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse"></div>

      {/* ========== CONTENU PRINCIPAL ========== */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 z-10">
        <div className="w-full max-w-md">
          
          {/* Logo et titre */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 opacity-75 blur-md animate-spin-slow"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden">
                  <img src="/logo.png" alt="MBX Logo" className="w-full h-full object-cover rounded-xl scale-105" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">MBX Réparations</h1>
            <p className="text-orange-400 text-sm mt-2 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">ESPACE ADMINISTRATEUR</p>
          </div>

          {/* Carte de connexion néon */}
          <div className="relative">
            {/* Cadre néon extérieur */}
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-2xl opacity-30"></div>
            
            <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl p-8 border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
              
              {!showReset ? (
                // FORMULAIRE DE CONNEXION
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-orange-400 text-sm font-semibold mb-2 drop-shadow-[0_0_4px_rgba(249,115,22,0.3)]">
                      📧 EMAIL
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400">📧</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-orange-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        placeholder="admin@mbx.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-orange-400 text-sm font-semibold mb-2 drop-shadow-[0_0_4px_rgba(249,115,22,0.3)]">
                      🔒 MOT DE PASSE
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400">🔒</span>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-orange-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                      <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="relative group/btn w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_35px_rgba(249,115,22,0.7)] hover:scale-105 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>CONNEXION...</span>
                        </>
                      ) : (
                        <>
                          <span>🔐</span>
                          <span>SE CONNECTER</span>
                          <span>→</span>
                        </>
                      )}
                    </span>
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowReset(true)}
                      className="text-orange-400 text-sm hover:text-orange-300 transition-colors duration-300 drop-shadow-[0_0_4px_rgba(249,115,22,0.3)]"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                </form>
              ) : (
                // FORMULAIRE DE RÉINITIALISATION
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="text-center mb-4">
                    <div className="text-5xl mb-3">🔐</div>
                    <h2 className="text-2xl font-bold text-white">Réinitialisation</h2>
                    <p className="text-gray-400 text-sm mt-2">Entrez votre email pour recevoir un lien</p>
                  </div>

                  <div>
                    <label className="block text-orange-400 text-sm font-semibold mb-2">📧 EMAIL</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400">📧</span>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-orange-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="votre@email.com"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                      <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                  )}

                  {resetSent && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3">
                      <p className="text-green-400 text-sm text-center">✅ Email envoyé ! Vérifiez votre boîte</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="relative group/btn w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_35px_rgba(249,115,22,0.7)] hover:scale-105 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? "ENVOI..." : "📧 ENVOYER"}
                    </span>
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReset(false);
                        setError("");
                        setResetEmail("");
                      }}
                      className="text-gray-400 text-sm hover:text-orange-400 transition-colors duration-300"
                    >
                      ← Retour à la connexion
                    </button>
                  </div>
                </form>
              )}

              {/* Séparateur néon */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-orange-500/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-black/80 text-orange-400/60">ACCÈS RESTREINT</span>
                </div>
              </div>

              {/* Lien retour accueil */}
              <div className="text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-gray-400 hover:text-orange-400 transition-colors duration-300 text-sm group"
                >
                  <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
                  Retour à l'accueil
                </Link>
              </div>
            </div>
          </div>

          {/* Footer néon */}
          <div className="text-center mt-8">
            <p className="text-gray-500 text-xs">
              🔒 Connexion sécurisée - Espace réservé aux administrateurs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}