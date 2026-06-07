// app/register/page.js (version corrigée)
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation du mot de passe (majuscule, minuscule, chiffre)
  const validatePassword = (pwd) => {
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasMinLength = pwd.length >= 8;

    if (!hasMinLength) return "Le mot de passe doit contenir au moins 8 caractères";
    if (!hasUpperCase) return "Le mot de passe doit contenir au moins une majuscule";
    if (!hasLowerCase) return "Le mot de passe doit contenir au moins une minuscule";
    if (!hasNumber) return "Le mot de passe doit contenir au moins un chiffre";
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validations de base
    if (!name.trim()) {
      setError("Veuillez entrer votre nom complet");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Veuillez entrer votre email");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    // Validation du mot de passe
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    try {
      console.log("Tentative d'inscription pour:", email);

      // 1. Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            phone: phone,
            shop_name: shopName,
          },
        },
      });

      if (signUpError) {
        console.error("SignUp Error:", signUpError);

        if (signUpError.message.includes("already registered")) {
          setError("Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.");
        } else if (signUpError.message.includes("password")) {
          setError(
            "Le mot de passe doit contenir au moins 8 caractères avec une majuscule, une minuscule et un chiffre."
          );
        } else {
          setError("Erreur d'inscription: " + signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (authData.user) {
        console.log("Utilisateur créé:", authData.user.id);

        // 2. Date de fin d'essai (7 jours)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        // 3. Créer le profil
        const profileData = {
          id: authData.user.id,
          email: email,
          name: name,
          phone: phone || null,
          shop_name: shopName || null,
          created_at: new Date().toISOString(),
          is_admin: false,
        };

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(profileData, { onConflict: "id" });

        if (profileError) {
          console.error("Profile Error:", profileError);
        }

        // 4. Créer la licence d'essai
        const licenceData = {
          email: email,
          profile_id: authData.user.id,
          device_fingerprint: `trial_${authData.user.id}_${Date.now()}`,
          device_name: "Essai gratuit 7 jours",
          status: "active",
          is_trial: true,
          trial_end_date: trialEndDate.toISOString(),
          approved_at: new Date().toISOString(),
        };

        const { error: licenceError } = await supabase
          .from("licences")
          .upsert(licenceData, { onConflict: "email" });

        if (licenceError) {
          console.error("Licence Error:", licenceError);
        }

        setSuccess(true);

        // Rediriger après 3 secondes
        setTimeout(() => {
          router.push("/login?registered=true");
        }, 3000);
      }
    } catch (error) {
      console.error("Erreur inscription:", error);
      setError("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Inscription réussie !</h2>
          <p className="text-gray-600 mb-4">
            Votre compte a été créé avec succès.
            <br />
            Vous bénéficiez de <strong className="text-green-600">7 jours d'essai gratuits</strong>.
          </p>
          <div className="bg-green-50 p-3 rounded-lg mb-4">
            <p className="text-green-800 text-sm">
              📅 Votre essai se termine le{" "}
              {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <p className="text-gray-500 text-sm">Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔧</div>
          <h1 className="text-2xl font-bold text-gray-800">MBXrepair</h1>
          <p className="text-gray-500 text-sm">Créez votre compte</p>
        </div>

        <h2 className="text-xl font-semibold text-center mb-6">Inscription</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Jean Dupont"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="atelier@exemple.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="06 12 34 56 78"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'atelier (optionnel)
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Mon Atelier"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="Ex: MonPass123"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Doit contenir : 8 caractères min, une majuscule, une minuscule, un chiffre
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
          >
            {loading ? "Création du compte..." : "🎉 Créer mon compte (7 jours gratuits)"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-blue-600 hover:underline text-sm">
            Déjà un compte ? Se connecter
          </Link>
        </div>

        <div className="mt-6 p-3 bg-green-50 rounded-lg text-center">
          <p className="text-green-800 text-sm font-medium">🎁 Offre de lancement</p>
          <p className="text-green-600 text-xs">
            7 jours d'essai gratuits • Sans engagement • Annulation à tout moment
          </p>
          <p className="text-gray-500 text-xs mt-2">✓ Toutes les fonctionnalités incluses</p>
        </div>
      </div>
    </div>
  );
}
