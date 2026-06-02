"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [clientCode, setClientCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVideo, setShowVideo] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");

  const handleClientTracking = async (e) => {
    e.preventDefault();
    if (!clientCode.trim()) {
      setError("Veuillez entrer votre code de suivi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, name, client_code")
        .eq("client_code", clientCode.toUpperCase())
        .single();
      if (clientError || !client) {
        setError("Code de suivi invalide. Vérifiez votre code.");
        setLoading(false);
        return;
      }
      router.push(`/suivi-client?code=${client.client_code}`);
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.pathname !== "/") {
      router.push("/");
    }
  };

  const openTrackingModal = () => {
    setShowTrackingModal(true);
    setError("");
    setTrackingCode("");
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      router.push(`/suivi-client?code=${trackingCode.toUpperCase()}`);
      setShowTrackingModal(false);
      setTrackingCode("");
    } else {
      setError("Veuillez entrer votre code de suivi");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      
      {/* ========== HEADER NEON PRO ========== */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-2xl border-b border-orange-500/40 shadow-[0_0_50px_rgba(249,115,22,0.2)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 py-2">
            
            {/* LOGO À GAUCHE AVEC ANNEAU LUMINEUX ROTATIF */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogoClick}>
              <div className="relative">
                <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 opacity-75 group-hover:opacity-100 blur-md animate-spin-slow"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden">
                  <img src="/logo.png" alt="MBX Logo" className="w-full h-full object-cover rounded-xl scale-105" />
                </div>
              </div>
              <div className="leading-tight">
                <span className="text-white font-black text-2xl tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">MBX</span>
                <span className="text-orange-400 text-[10px] block -mt-1 font-bold tracking-[0.2em] drop-shadow-[0_0_4px_rgba(249,115,22,0.8)]">RÉPARATIONS</span>
              </div>
            </div>

            {/* NAVIGATION CENTRALE */}
            <nav className="hidden lg:flex items-center gap-1 bg-white/5 backdrop-blur-xl rounded-full p-1 border border-white/10 shadow-2xl">
              <a href="/client/soumettre-appareil" className="relative px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 group/item overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-full"></span>
                <span className="relative z-10 flex items-center gap-2">📱 Déclarer</span>
              </a>
              <button onClick={openTrackingModal} className="relative px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 group/item overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-full"></span>
                <span className="relative z-10 flex items-center gap-2">🔍 Suivre</span>
              </button>
              <a href="#reparations" className="relative px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 group/item overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-full"></span>
                <span className="relative z-10 flex items-center gap-2">⚡ Réparations</span>
              </a>
              <a href="#centre" className="relative px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 group/item overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-full"></span>
                <span className="relative z-10 flex items-center gap-2">🔧 Centre</span>
              </a>
              <a href="#formation" className="relative px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 group/item overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-full"></span>
                <span className="relative z-10 flex items-center gap-2">🎓 Formation</span>
              </a>
              <a href="#envoi" className="relative px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 group/item overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-full"></span>
                <span className="relative z-10">📦 Envoi</span>
              </a>
              <a href="#contact" className="relative px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 group/item overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-full"></span>
                <span className="relative z-10 flex items-center gap-2">💬 Contact</span>
              </a>
            </nav>

            {/* ESPACE PRO À DROITE */}
            <Link
              href="/login"
              className="relative group/btn flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-sm font-bold tracking-wider transition-all duration-300 shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:shadow-[0_0_40px_rgba(249,115,22,0.7)] hover:scale-105 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
              <span className="absolute -inset-1 bg-orange-500 rounded-full blur-xl opacity-0 group-hover/btn:opacity-50 transition-opacity duration-500"></span>
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-lg drop-shadow-[0_0_2px_white]">👨‍💼</span>
                <span className="hidden sm:inline">ESPACE PRO</span>
                <span className="inline sm:hidden">PRO</span>
                <svg className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>

          {/* MOBILE */}
          <div className="lg:hidden pb-3">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <a href="/client/soumettre-appareil" className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1">📱 Déclarer</a>
              <button onClick={openTrackingModal} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1">🔍 Suivre</button>
              <a href="#reparations" className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1">⚡ Réparations</a>
              <a href="#centre" className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1">🔧 Centre</a>
              <a href="#formation" className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1">🎓 Formation</a>
              <a href="#envoi" className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1">📦 Envoi</a>
              <a href="#contact" className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1">💬 Contact</a>
            </div>
            <div className="mt-3">
              <Link href="/login" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-sm font-bold shadow-lg">👨‍💼 ESPACE PRO</Link>
            </div>
          </div>
        </div>
      </header>

      {/* ========== HERO SECTION NEON ULTRA MODERNE - VIDÉO MAX ========== */}
<section className="relative bg-black overflow-hidden">
  {/* Effet de fond néon dynamique */}
  <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black"></div>
  
  {/* Grille de fond lumineuse */}
  <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
  
  {/* Effet de lumière néon centrale */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/20 rounded-full blur-[120px] animate-pulse"></div>
  
  {/* Effet de faisceaux lumineux */}
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
    <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500/30 rounded-full blur-[80px] animate-pulse"></div>
    <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-orange-600/30 rounded-full blur-[80px] animate-pulse delay-1000"></div>
    <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-orange-400/20 rounded-full blur-[60px] animate-ping"></div>
  </div>
  
  {/* Lignes néon décoratives */}
  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse"></div>
  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse"></div>

  <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20 z-10">
    <div className="grid lg:grid-cols-2 gap-8 items-center">
      
      {/* TEXTE GAUCHE - EFFET NEON */}
      <div className="text-center lg:text-left space-y-5">
        
        {/* Badge avec effet néon */}
        <div className="inline-flex items-center gap-2 bg-orange-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
          </span>
          <span className="text-xs font-bold text-orange-400 tracking-wider drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]">EXPERT EN RÉPARATION</span>
        </div>

        {/* Titre principal néon */}
        <h1 className="text-4xl lg:text-6xl font-black leading-tight">
          <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            Réparation pro
          </span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)] animate-pulse">
            & pièces sur mobilax.fr
          </span>
        </h1>

        {/* Description avec effet lumineux */}
        <p className="text-gray-300 text-sm leading-relaxed max-w-xl mx-auto lg:mx-0 drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]">
          <span className="text-orange-400 font-semibold">✨ Envoyez votre appareil par colis</span>, nous le réparons et vous pouvez commander vos accessoires, coques, chargeurs et pièces détachées. 
          <span className="block mt-1 text-orange-300 font-medium text-xs">📦 Le tout retourné ensemble dans le même colis !</span>
        </p>

        {/* Bouton vidéo néon */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
          <button
            onClick={() => setShowVideo(true)}
            className="group relative flex items-center justify-center gap-2 px-6 py-3 bg-black/50 backdrop-blur-sm border-2 border-orange-500 rounded-xl font-bold text-orange-400 transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] hover:scale-105 text-sm"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-lg group-hover:animate-pulse">▶</span>
              <span>REGARDER LA VIDÉO</span>
            </span>
          </button>
        </div>

        {/* Statistiques néon */}
        <div className="flex flex-wrap gap-6 pt-6 justify-center lg:justify-start">
          <div className="text-center">
            <div className="text-xl mb-1">📱</div>
            <div className="text-xl font-black text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">10K+</div>
            <div className="text-[10px] text-gray-400">Appareils réparés</div>
          </div>
          <div className="text-center">
            <div className="text-xl mb-1">⭐</div>
            <div className="text-xl font-black text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">98%</div>
            <div className="text-[10px] text-gray-400">Clients satisfaits</div>
          </div>
          <div className="text-center">
            <div className="text-xl mb-1">⚡</div>
            <div className="text-xl font-black text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">24h</div>
            <div className="text-[10px] text-gray-400">Délai moyen</div>
          </div>
        </div>
      </div>

      {/* VIDÉO À DROITE - AGRANDIE ET OPTIMISÉE */}
      <div className="relative flex justify-center">
        {/* Cadre néon extérieur - Plus grand */}
        <div className="absolute -inset-6 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
        <div className="absolute -inset-6 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-2xl opacity-30 animate-spin-slow"></div>
        <div className="absolute -inset-3 border-2 border-orange-500/50 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.6)]"></div>
        
        {/* Conteneur vidéo - Plus grand */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg">
          <video 
            autoPlay
            loop
            muted
            playsInline
            className="relative rounded-2xl w-full h-auto object-cover border-2 border-orange-500/50"
            style={{ maxHeight: "400px" }}
          >
            <source src="/video.mp4" type="video/mp4" />
            <img src="/imagesoudure.png" alt="Réparation carte mère" className="w-full h-auto" />
          </video>
          
          {/* Overlay néon sur la vidéo */}
          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/30 via-transparent to-transparent pointer-events-none"></div>
          
          {/* Badge lecture néon */}
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md rounded-full px-2.5 py-1 border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
            <span className="text-orange-400 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              MBX
            </span>
          </div>
        </div>
        
        {/* Effets de particules néon */}
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-500/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-orange-600/20 rounded-full blur-2xl animate-pulse delay-700"></div>
      </div>
    </div>
  </div>
</section>

      {/* ========== MBX CENTRE DE RÉPARATION & FORMATION ========== */}
      <section id="centre" className="py-28 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-orange-500/20 rounded-full px-5 py-2.5 mb-6 backdrop-blur-sm border border-orange-500/30">
              <span className="text-2xl">🔧</span>
              <span className="text-orange-400 font-semibold tracking-wide">MBX Centre</span>
            </div>
            <h2 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              CENTRE DE RÉPARATION & FORMATION
            </h2>
            <p className="text-xl text-orange-400 max-w-3xl mx-auto font-light">
              Expertise – Technologie – Réparation Avancée
            </p>
          </div>

          <div className="text-center mb-20">
            <p className="text-gray-300 text-xl max-w-4xl mx-auto leading-relaxed">
              MBX Centre de Réparation & Formation est votre atelier spécialisé dans la réparation électronique, 
              smartphone et microsoudure professionnelle.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {["iPhone", "Samsung", "Huawei", "Xiaomi", "Oppo", "Redmi", "Honor", "Tablettes"].map((brand) => (
                <span key={brand} className="px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm rounded-full text-sm font-medium hover:bg-gray-700 transition border border-gray-600">
                  {brand}
                </span>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              {
                icon: "📱",
                title: "Réparation & Remplacement",
                items: ["Écran LCD / OLED", "Batterie", "Connecteur de charge", "Caméra avant/arrière", "Micro & haut-parleur", "Boutons Power/Volume", "Vitre arrière", "Nappes & capteurs"]
              },
              {
                icon: "⚡",
                title: "Carte Mère & Microsoudure",
                subtitle: "Interventions avancées",
                items: ["Diagnostic électronique", "Réparation carte mère", "Circuits endommagés", "Court-circuit", "Ports de charge", "Wi-Fi / Bluetooth", "Face ID / Touch ID", "Composants CMS / IC"]
              },
              {
                icon: "🛠️",
                title: "Diagnostic & Solutions",
                items: ["Contrôle technique approfondi", "Identification précise", "Solutions fiables", "Réparation rapide", "Garantie durable"]
              }
            ].map((service, idx) => (
              <div key={idx} className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 hover:bg-gray-800/50 transition-all duration-300 border border-gray-700 hover:border-orange-500/50 group">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-4xl mb-6 mx-auto shadow-lg group-hover:scale-110 transition duration-300">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold text-center mb-4 text-white">{service.title}</h3>
                {service.subtitle && <p className="text-orange-400 text-sm text-center mb-4">{service.subtitle}</p>}
                <ul className="space-y-2 text-gray-300 text-sm">
                  {service.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">✓ {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div id="formation" className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 rounded-2xl p-12 text-center shadow-2xl border border-orange-400/50">
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-5xl mx-auto mb-6 backdrop-blur-sm">🎓</div>
            <h3 className="text-3xl lg:text-4xl font-bold mb-4 text-white">Centre de Formation Professionnelle</h3>
            <p className="text-white/90 text-lg max-w-3xl mx-auto mb-8">
              MBX accompagne les futurs techniciens avec des formations spécialisées en réparation mobile et microsoudure.
            </p>
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
              {["Diagnostic de panne", "Réparation toutes marques", "Changement de composants", "Lecture de schémas", "Réparation carte mère", "Microsoudure pro"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2.5 backdrop-blur-sm text-white">✔ {item}</div>
              ))}
            </div>
            <a 
              href="https://mobilax-academy.fr/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-orange-600 px-10 py-4 rounded-xl font-bold hover:bg-gray-100 hover:scale-105 transition-all duration-200 shadow-lg text-lg group"
            >
              🎓 Demander une formation
              <span className="text-orange-400 group-hover:translate-x-1 transition-transform duration-200">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ========== RÉPARATIONS ========== */}
      <section id="reparations" className="py-28 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Réparations professionnelles</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Plus de 10 000 appareils réparés avec succès par nos experts</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: "📱", title: "Smartphones", desc: "iPhone, Samsung, Xiaomi, Pixel" },
              { icon: "💻", title: "Ordinateurs", desc: "MacBook, PC portable, iMac" },
              { icon: "📟", title: "Tablettes", desc: "iPad, Samsung Tab, Fire" },
              { icon: "⌚", title: "Montres", desc: "Apple Watch, Galaxy Watch" }
            ].map((item, idx) => (
              <div key={idx} className="text-center p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border border-gray-800 bg-gray-900/50 hover:border-orange-500/50 group">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 group-hover:scale-110 transition duration-300">
                  {item.icon}
                </div>
                <h3 className="font-bold text-xl text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== ENVOI PAR COLIS ========== */}
      <section id="envoi" className="py-28 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/20 rounded-full px-5 py-2.5 mb-6 border border-orange-500/30">
                <span className="text-2xl">📦</span>
                <span className="text-orange-400 font-semibold">Service clé en main</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Faites réparer vos appareils où que vous soyez</h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                Où que vous soyez en Europe, confiez-nous la réparation de votre appareil. Emballage sécurisé, garantie incluse.
              </p>
              <div className="space-y-5 mb-10">
                {[
                  "France et Europe – Belgique, Suisse, Allemagne, Italie, Espagne",
                  "Emballage sécurisé – Protection renforcée",
                  "Garantie sur toutes nos réparations"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-sm mt-0.5 shadow-md">✓</div>
                    <p className="text-gray-300 font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1580679568899-1b1b5e446ae3?w=600&h=500&fit=crop" 
                alt="Colis réparation"
                className="rounded-2xl shadow-2xl w-full object-cover border border-gray-700"
              />
              <div className="absolute -top-6 -left-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🚚</span>
                  <div>
                    <p className="font-bold text-white">Livraison offerte</p>
                    <p className="text-xs text-orange-200">avec votre commande</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== COMMANDE ========== */}
      <section id="commande" className="py-28 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 rounded-full px-5 py-2.5 mb-4 border border-orange-500/30">
              <span className="text-2xl">🛒</span>
              <span className="text-orange-400 font-semibold">Boutique partenaire</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Commandez sur <a href="https://www.mobilax.fr" target="_blank" className="text-orange-500 hover:underline">mobilax.fr</a>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Pièces détachées, coques, chargeurs, écrans, batteries... Livraison gratuite avec votre réparation
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
            <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 group hover:border-orange-500/50">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 group-hover:scale-110 transition">
                📱
              </div>
              <h3 className="font-bold text-2xl text-white mb-2">Pièces détachées</h3>
              <p className="text-gray-400 mb-4">Écrans, batteries, connectiques, vitres</p>
              <a href="https://www.mobilax.fr" target="_blank" className="inline-block text-orange-500 font-semibold hover:underline">Voir les pièces →</a>
            </div>
            <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 group hover:border-orange-500/50">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 group-hover:scale-110 transition">
                🔋
              </div>
              <h3 className="font-bold text-2xl text-white mb-2">Accessoires & coques</h3>
              <p className="text-gray-400 mb-4">Coques, chargeurs, câbles, écouteurs</p>
              <a href="https://www.mobilax.fr" target="_blank" className="inline-block text-orange-500 font-semibold hover:underline">Voir les accessoires →</a>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-10 text-white text-center shadow-2xl">
            <div className="grid md:grid-cols-3 gap-8">
              <div><div className="text-4xl mb-3">💰</div><p className="font-bold text-xl">Économies</p><p className="text-orange-100">Pas de frais de port</p></div>
              <div><div className="text-4xl mb-3">📦</div><p className="font-bold text-xl">Colis unique</p><p className="text-orange-100">Appareil + commande</p></div>
              <div><div className="text-4xl mb-3">⚡</div><p className="font-bold text-xl">Rapide</p><p className="text-orange-100">Traitement prioritaire</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CONTACT ========== */}
      <section id="contact" className="py-28 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/20 rounded-full px-5 py-2.5 mb-6 border border-orange-500/30">
                <span className="text-xl">📍</span>
                <span className="text-orange-400 font-semibold">Notre atelier</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-6">MBX Réparations</h2>
              <div className="space-y-5 mb-8">
                <div className="flex items-start gap-3"><span className="text-xl">📍</span><div><p className="font-semibold text-white">Adresse</p><p className="text-gray-300">8 Rue de l'Épée, 69003 Lyon</p></div></div>
                <div className="flex items-start gap-3"><span className="text-xl">📞</span><div><p className="font-semibold text-white">Téléphone</p><p className="text-gray-300">04 72 60 16 13</p></div></div>
                <div className="flex items-start gap-3"><span className="text-xl">✉️</span><div><p className="font-semibold text-white">Email</p><p className="text-gray-300">mbxmobilax@gmail.com</p></div></div>
                <div className="flex items-start gap-3"><span className="text-xl">⏰</span><div><p className="font-semibold text-white">Horaires</p><p className="text-gray-300">Lundi - vendredi : 10h - 18h</p></div></div>
              </div>
              <a href="https://www.google.com/maps?q=8+Rue+de+l'Épée,+69003+Lyon" target="_blank" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 font-semibold">Voir sur Google Maps →</a>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-800">
              <h3 className="text-2xl font-bold text-white mb-4">Une question ?</h3>
              <p className="text-gray-400 mb-6">Notre équipe vous répond sous 24h</p>
              <form>
                <input type="text" placeholder="Votre nom" className="w-full px-5 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                <input type="email" placeholder="Votre email" className="w-full px-5 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                <textarea rows="4" placeholder="Votre message" className="w-full px-5 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"></textarea>
                <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition shadow-md">Envoyer le message</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-black border-t border-orange-500/20 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p>© {new Date().getFullYear()} MBX Réparations - 8 Rue de l'Épée, 69003 Lyon - 04 72 60 16 13</p>
          <p className="text-sm mt-3">Réparation professionnelle + Pièces sur <a href="https://www.mobilax.fr" target="_blank" className="text-orange-400 hover:underline">mobilax.fr</a></p>
        </div>
      </footer>

      {/* Modal vidéo YouTube */}
      {showVideo && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setShowVideo(false)}>
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowVideo(false)} className="absolute -top-14 right-0 text-white text-3xl hover:text-orange-400 transition">✕</button>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-orange-500/30">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/_Ly_VG0SHP4" 
                title="Vidéo MBX" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suivi */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowTrackingModal(false)}>
          <div className="relative max-w-md w-full bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-8 border border-orange-500/30" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTrackingModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-orange-400 text-2xl transition">✕</button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-orange-500/30">🔍</div>
              <h3 className="text-2xl font-bold text-white">Suivi de réparation</h3>
              <p className="text-gray-400 mt-2">Entrez votre code client</p>
            </div>
            <form onSubmit={handleTrackSubmit}>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="📱 Code client (ex: DOM923167)"
                className="w-full px-5 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                required
              />
              {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition shadow-md"
              >
                Suivre mon appareil
              </button>
            </form>
            <p className="text-center text-gray-500 text-xs mt-4">
              Nouveau client ? <a href="/client/soumettre-appareil" className="text-orange-500 hover:underline">Déclarez votre appareil</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}