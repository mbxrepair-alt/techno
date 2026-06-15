"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import Layout from "../components/Layout";
import AssistantPublic from "../components/AssistantPublic";
import InstallPWA from "../components/InstallPWA";

export default function HomePage() {
  const router = useRouter();
  const [clientCode, setClientCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [showVideo, setShowVideo] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingName, setTrackingName] = useState("");

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
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.location.pathname !== "/") {
      router.push("/");
    }
  };

  const openTrackingModal = () => {
    router.push("/suivi-client");
  };

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!trackingName.trim()) {
      setError("Veuillez entrer votre nom");
      return;
    }
    if (!trackingCode.trim()) {
      setError("Veuillez entrer votre code de suivi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const code = trackingCode.toUpperCase().trim();
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("name, client_code")
        .eq("client_code", code)
        .single();
      if (clientError || !client) {
        setError("Code de suivi invalide. Vérifiez votre code.");
        setLoading(false);
        return;
      }
      // Vérifier que le nom saisi correspond bien au code
      const saisi = trackingName.trim().toLowerCase();
      const officiel = (client.name || "").trim().toLowerCase();
      if (!officiel.includes(saisi) && !saisi.includes(officiel)) {
        setError("Le nom ne correspond pas à ce code client.");
        setLoading(false);
        return;
      }
      router.push(`/suivi-client?code=${code}`);
      setShowTrackingModal(false);
      setTrackingCode("");
      setTrackingName("");
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#080810]">
        {/* ========== HEADER NEON PRO ========== */}
        <header className="sticky top-0 z-50 bg-[#080810]/95 backdrop-blur-2xl border-b border-orange-500/20 shadow-[0_0_40px_rgba(249,115,22,0.1)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 py-2.5">
              {/* LOGO */}
              <div className="flex items-center gap-3 cursor-pointer group shrink-0" onClick={handleLogoClick}>
                <div className="relative">
                  <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 opacity-75 group-hover:opacity-100 blur-md animate-spin-slow"></div>
                  <div className="relative w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden">
                    <img src="/logo.png" alt="MBX Logo" className="w-full h-full object-cover rounded-xl scale-105" />
                  </div>
                </div>
                <div className="leading-tight text-center hidden sm:block">
                  <span className="text-white font-black text-xl tracking-tight leading-none block">MBX</span>
                  <span className="text-orange-400 text-[9px] block mt-0.5 font-bold tracking-[0.2em]">CENTRE</span>
                  <span className="text-orange-400 text-[9px] block font-bold tracking-[0.2em]">DE RÉPARATION</span>
                </div>
              </div>

              {/* NAV CENTRÉE */}
              <nav className="hidden lg:flex items-center gap-0.5 bg-white/[0.04] backdrop-blur-2xl rounded-2xl p-1.5 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
                {([
                  { href: "/client/soumettre-appareil", icon: "📱", label: "Déclarer", isButton: false },
                  { href: null, icon: "🔍", label: "Suivre", isButton: true },
                  { href: "#reparations", icon: "⚡", label: "Réparations", isButton: false },
                  { href: "#centre", icon: "🔧", label: "Centre", isButton: false },
                  { href: "#formation", icon: "🎓", label: "Formation", isButton: false },
                  { href: "#envoi", icon: "📦", label: "Envoi", isButton: false },
                  { href: "#contact", icon: "💬", label: "Contact", isButton: false },
                ] as { href: string | null; icon: string; label: string; isButton: boolean }[]).map(({ href, icon, label, isButton }) => {
                  const cls = "relative group/nav flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium text-gray-400 hover:text-white transition-all duration-200 overflow-hidden cursor-pointer select-none";
                  const inner = (
                    <>
                      <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-orange-500/20 to-orange-600/10 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 border border-orange-500/20" />
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-orange-500/60 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 blur-[2px]" />
                      <span className="relative z-10 text-base group-hover/nav:scale-110 group-hover/nav:-translate-y-0.5 transition-transform duration-200 inline-block">{icon}</span>
                      <span className="relative z-10 group-hover/nav:text-white transition-colors duration-200">{label}</span>
                    </>
                  );
                  return isButton
                    ? <button key={label} onClick={openTrackingModal} className={cls}>{inner}</button>
                    : <a key={label} href={href!} className={cls}>{inner}</a>;
                })}
              </nav>

              {/* BOUTONS DROITE */}
              <div className="flex items-center gap-2 shrink-0">
                <a href="/mbx.apk" download title="App Android"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] border border-white/[0.08] text-gray-300 rounded-xl text-xs font-semibold hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-white transition-all duration-200">
                  <svg className="w-3.5 h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/></svg>
                  <span className="hidden md:inline">App</span>
                </a>
                <Link href="/login"
                  className="relative group/btn flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-bold transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] hover:scale-105 overflow-hidden">
                  <span className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"/>
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-base">👨‍💼</span>
                    <span className="hidden sm:inline tracking-wide">ESPACE PRO</span>
                    <span className="inline sm:hidden">PRO</span>
                    <svg className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </span>
                </Link>
              </div>
            </div>

            {/* MOBILE */}
            <div className="lg:hidden pb-3">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <a
                  href="/client/soumettre-appareil"
                  className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1"
                >
                  📱 Déclarer
                </a>
                <button
                  onClick={openTrackingModal}
                  className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1"
                >
                  🔍 Suivre
                </button>
                <a
                  href="#reparations"
                  className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1"
                >
                  ⚡ Réparations
                </a>
                <a
                  href="#centre"
                  className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1"
                >
                  🔧 Centre
                </a>
                <a
                  href="#formation"
                  className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1"
                >
                  🎓 Formation
                </a>
                <a
                  href="#envoi"
                  className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1"
                >
                  📦 Envoi
                </a>
                <a
                  href="#contact"
                  className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 whitespace-nowrap flex items-center gap-1"
                >
                  💬 Contact
                </a>
              </div>
              <div className="mt-3">
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-sm font-bold shadow-lg"
                >
                  👨‍💼 ESPACE PRO
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ========== HERO SECTION NEON ULTRA MODERNE ========== */}
        <section className="relative bg-[#080810] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#080810] via-[#0c0c18] to-[#080810]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500/30 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-orange-600/30 rounded-full blur-[80px] animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-orange-400/20 rounded-full blur-[60px] animate-ping"></div>
          </div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse"></div>

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20 z-10">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-2 bg-orange-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                  </span>
                  <span className="text-xs font-bold text-orange-400 tracking-wider drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]">
                    CENTRE DE RÉPARATION PROFESSIONNEL · LYON
                  </span>
                </div>
                <h1 className="text-4xl lg:text-6xl font-black leading-tight">
                  <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    Votre téléphone
                  </span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                    réparé par des experts
                  </span>
                </h1>
                <p className="text-gray-300 text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Déposez en boutique ou{" "}
                  <span className="text-orange-400 font-semibold">envoyez vos appareils par colis</span> — nos techniciens interviennent sur tous types de pannes, de l'écran à la carte mère. <span className="text-white font-medium">Suivi en temps réel</span> à chaque étape de la réparation.
                </p>
                <a
                  href="https://www.mobilax.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/5 border border-orange-500/30 hover:border-orange-500/70 hover:bg-orange-500/10 rounded-xl px-4 py-2.5 transition-all duration-200 group/mobilax"
                >
                  <span className="text-lg">📦</span>
                  <div>
                    <span className="text-sm text-white font-semibold block">Commandez sur <span className="text-orange-400 group-hover/mobilax:text-white transition-colors">mobilax.fr</span></span>
                    <span className="text-xs text-gray-400">Votre commande + vos appareils réparés expédiés ensemble dans un seul colis.</span>
                  </div>
                  <span className="text-orange-400 font-bold group-hover/mobilax:text-white transition-colors">→</span>
                </a>
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
                <div className="flex flex-wrap gap-6 pt-6 justify-center lg:justify-start">
                  <div className="text-center">
                    <div className="text-xl mb-1">📱</div>
                    <div className="text-xl font-black text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                      10K+
                    </div>
                    <div className="text-[10px] text-gray-400">Appareils réparés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl mb-1">⭐</div>
                    <div className="text-xl font-black text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                      98%
                    </div>
                    <div className="text-[10px] text-gray-400">Clients satisfaits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl mb-1">⚡</div>
                    <div className="text-xl font-black text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                      24h
                    </div>
                    <div className="text-[10px] text-gray-400">Délai moyen</div>
                  </div>
                </div>
              </div>
              <div className="relative flex justify-center">
                <div className="absolute -inset-6 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
                <div className="absolute -inset-6 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-2xl opacity-30 animate-spin-slow"></div>
                <div className="absolute -inset-3 border-2 border-orange-500/50 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.6)]"></div>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="relative rounded-2xl w-full h-auto object-cover border-2 border-orange-500/50"
                    style={{ maxHeight: "400px" }}
                  >
                    <source
                      src="https://res.cloudinary.com/dwzyavrgz/video/upload/v1780425459/video_hmrh3o.mov"
                      type="video/mp4"
                    />
                    <img
                      src="/imagesoudure.png"
                      alt="Réparation carte mère"
                      className="w-full h-auto"
                    />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-500/30 via-transparent to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md rounded-full px-2.5 py-1 border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                    <span className="text-orange-400 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>MBX
                    </span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-orange-600/20 rounded-full blur-2xl animate-pulse delay-700"></div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== MBX CENTRE DE RÉPARATION & FORMATION ========== */}
        <section
          id="centre"
          className="py-28 bg-[#0e0e1c]"
        >
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
                MBX est un vrai centre de réparation, pas seulement un changeur d'écrans. Nos techniciens interviennent sur la <span className="text-orange-400 font-semibold">carte mère par microsoudure</span>, avec caméra thermique et bain à ultrasons — pour les pannes que les autres ne savent pas réparer.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                {[
                  { name: "iPhone",   logo: "https://cdn.simpleicons.org/apple/000000" },
                  { name: "Samsung",  logo: "https://cdn.simpleicons.org/samsung/1428A0" },
                  { name: "Huawei",   logo: "https://cdn.simpleicons.org/huawei/CF0A2C" },
                  { name: "Xiaomi",   logo: "https://cdn.simpleicons.org/xiaomi/FF6900" },
                  { name: "Oppo",     logo: "https://cdn.simpleicons.org/oppo/1D8348" },
                  { name: "Redmi",    logo: "https://cdn.simpleicons.org/xiaomi/FF6900" },
                  { name: "Honor",    logo: "https://cdn.simpleicons.org/honor/000000" },
                  { name: "OnePlus",  logo: "https://cdn.simpleicons.org/oneplus/F5010D" },
                  { name: "Google",   logo: "https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" },
                  { name: "Motorola", logo: "https://cdn.simpleicons.org/motorola/000000" },
                  { name: "Sony",     logo: "https://cdn.simpleicons.org/sony/000000" },
                  { name: "Vivo",     logo: "https://cdn.simpleicons.org/vivo/415FFF" },
                  { name: "LG",       logo: "https://cdn.simpleicons.org/lg/A50034" },
                ].map(({ name, logo }) => (
                  <div key={name} className="relative group/brand">
                    {/* Halo rotatif */}
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 opacity-0 group-hover/brand:opacity-100 blur-md transition-all duration-300 animate-spin-slow" />
                    {/* Bordure animée */}
                    <div className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-r from-orange-400 via-white to-orange-400 opacity-0 group-hover/brand:opacity-60 transition-all duration-300" />
                    {/* Carte */}
                    <div className="relative w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-3 transition-all duration-300 group-hover/brand:scale-115 group-hover/brand:-translate-y-1.5 group-hover/brand:shadow-[0_12px_40px_rgba(249,115,22,0.45)] cursor-pointer">
                      <img src={logo} alt={name} className="w-full h-full object-contain transition-transform duration-300 group-hover/brand:scale-110" />
                    </div>
                    {/* Tooltip nom */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover/brand:opacity-100 transition-all duration-200 group-hover/brand:translate-y-0 translate-y-1 pointer-events-none">
                      <span className="text-[10px] font-bold text-orange-400 tracking-widest uppercase bg-black/80 px-2 py-0.5 rounded-full border border-orange-500/30 backdrop-blur-sm">{name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {[
                {
                  icon: "📱",
                  title: "Réparation & Remplacement",
                  items: [
                    "Écran LCD / OLED",
                    "Batterie",
                    "Connecteur de charge",
                    "Caméra avant/arrière",
                    "Micro & haut-parleur",
                    "Boutons Power/Volume",
                    "Vitre arrière",
                    "Nappes & capteurs",
                  ],
                },
                {
                  icon: "⚡",
                  title: "Carte Mère & Microsoudure",
                  subtitle: "Interventions avancées",
                  items: [
                    "Diagnostic électronique",
                    "Réparation carte mère",
                    "Circuits endommagés",
                    "Court-circuit",
                    "Ports de charge",
                    "Wi-Fi / Bluetooth",
                    "Face ID / Touch ID",
                    "Composants CMS / IC",
                  ],
                },
                {
                  icon: "🛠️",
                  title: "Diagnostic & Solutions",
                  items: [
                    "Caméra thermique",
                    "Bain à ultrasons",
                    "Multimètre & oscillo",
                    "Dégâts des eaux",
                    "Récupération de données",
                    "Déverrouillage iCloud",
                    "Flashage logiciel",
                    "Téléphone ne s'allume plus",
                  ],
                },
              ].map((service, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 hover:bg-gray-800/50 transition-all duration-300 border border-gray-700 hover:border-orange-500/50 group"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-4xl mb-6 mx-auto shadow-lg group-hover:scale-110 transition duration-300">
                    {service.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-center mb-4 text-white">
                    {service.title}
                  </h3>
                  {service.subtitle && (
                    <p className="text-orange-400 text-sm text-center mb-4">{service.subtitle}</p>
                  )}
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {service.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        ✓ {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div
              id="formation"
              className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 rounded-2xl p-12 text-center shadow-2xl border border-orange-400/50"
            >
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-5xl mx-auto mb-6 backdrop-blur-sm">
                🎓
              </div>
              <h3 className="text-3xl lg:text-4xl font-bold mb-4 text-white">
                Centre de Formation Professionnelle
              </h3>
              <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
                {[
                  "Diagnostic de panne",
                  "Réparation toutes marques",
                  "Changement de composants",
                  "Lecture de schémas",
                  "Réparation carte mère",
                  "Microsoudure pro",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2.5 backdrop-blur-sm text-white"
                  >
                    ✔ {item}
                  </div>
                ))}
              </div>
              <a
                href="https://mobilax-academy.fr/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-orange-600 px-10 py-4 rounded-xl font-bold hover:bg-gray-100 hover:scale-105 transition-all duration-200 shadow-lg text-lg group"
              >
                🎓 Demander une formation{" "}
                <span className="text-orange-400 group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* ========== RÉPARATIONS ========== */}
        <section id="reparations" className="py-28 bg-[#080810]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Réparations professionnelles
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Plus de 10 000 appareils réparés avec succès par nos experts
              </p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  img: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=500&h=320&fit=crop&q=80",
                  icon: "📱", title: "Smartphones",
                  desc: "iPhone, Samsung, Xiaomi, Google Pixel, OnePlus, Huawei",
                },
                {
                  img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=320&fit=crop&q=80",
                  icon: "💻", title: "Ordinateurs",
                  desc: "MacBook, PC portable, iMac — écran, batterie, carte mère",
                },
                {
                  img: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&h=320&fit=crop&q=80",
                  icon: "📟", title: "Tablettes",
                  desc: "iPad, Samsung Tab, Lenovo — vitre, connecteur, batterie",
                },
                {
                  img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=320&fit=crop&q=80",
                  icon: "⌚", title: "Montres connectées",
                  desc: "Apple Watch, Galaxy Watch — vitre, batterie, couronne",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-900/50 hover:border-orange-500/50 group transition-all duration-300 hover:shadow-[0_8px_40px_rgba(249,115,22,0.15)]"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                    <span className="absolute top-3 right-3 text-2xl bg-black/50 rounded-xl p-1.5 backdrop-blur-sm">{item.icon}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-white mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== ENVOI PAR COLIS ========== */}
        <section
          id="envoi"
          className="py-28 bg-[#0e0e1c]"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-orange-500/20 rounded-full px-5 py-2.5 mb-6 border border-orange-500/30">
                  <span className="text-2xl">📦</span>
                  <span className="text-orange-400 font-semibold">Service clé en main</span>
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                  Faites réparer vos appareils où que vous soyez
                </h2>
                <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                  Où que vous soyez en Europe, confiez-nous la réparation de votre appareil.
                  Emballage sécurisé, garantie incluse.
                </p>
                <div className="space-y-5 mb-10">
                  {[
                    "France et Europe – Belgique, Suisse, Allemagne, Italie, Espagne",
                    "Emballage sécurisé – Protection renforcée",
                    "Garantie sur toutes nos réparations",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-sm mt-0.5 shadow-md">
                        ✓
                      </div>
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
                      <p className="font-bold text-white">Envoi sécurisé</p>
                      <p className="text-xs text-orange-200">France & Europe</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== COMMANDE ========== */}
        <section id="commande" className="py-28 bg-[#080810]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-orange-500/20 rounded-full px-5 py-2.5 mb-4 border border-orange-500/30">
                <span className="text-2xl">🛒</span>
                <span className="text-orange-400 font-semibold">Boutique partenaire</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                Commandez sur{" "}
                <a
                  href="https://www.mobilax.fr"
                  target="_blank"
                  className="text-orange-500 hover:underline"
                >
                  mobilax.fr
                </a>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Pièces détachées, coques, chargeurs, écrans, batteries... Livraison gratuite avec
                votre réparation
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
              <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 group hover:border-orange-500/50">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 group-hover:scale-110 transition">
                  📱
                </div>
                <h3 className="font-bold text-2xl text-white mb-2">Pièces détachées</h3>
                <p className="text-gray-400 mb-4">Écrans, batteries, connectiques, vitres</p>
                <a
                  href="https://www.mobilax.fr"
                  target="_blank"
                  className="inline-block text-orange-500 font-semibold hover:underline"
                >
                  Voir les pièces →
                </a>
              </div>
              <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 group hover:border-orange-500/50">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 group-hover:scale-110 transition">
                  🔋
                </div>
                <h3 className="font-bold text-2xl text-white mb-2">Accessoires & coques</h3>
                <p className="text-gray-400 mb-4">Coques, chargeurs, câbles, écouteurs</p>
                <a
                  href="https://www.mobilax.fr"
                  target="_blank"
                  className="inline-block text-orange-500 font-semibold hover:underline"
                >
                  Voir les accessoires →
                </a>
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-10 text-white text-center shadow-2xl">
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <div className="text-4xl mb-3">💰</div>
                  <p className="font-bold text-xl">Économies</p>
                  <p className="text-orange-100">Pas de frais de port</p>
                </div>
                <div>
                  <div className="text-4xl mb-3">📦</div>
                  <p className="font-bold text-xl">Colis unique</p>
                  <p className="text-orange-100">Appareil + commande</p>
                </div>
                <div>
                  <div className="text-4xl mb-3">⚡</div>
                  <p className="font-bold text-xl">Rapide</p>
                  <p className="text-orange-100">Traitement prioritaire</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CONTACT ========== */}
        <section
          id="contact"
          className="py-28 bg-[#0e0e1c]"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16">
              <div>
                <div className="inline-flex items-center gap-2 bg-orange-500/20 rounded-full px-5 py-2.5 mb-6 border border-orange-500/30">
                  <span className="text-xl">📍</span>
                  <span className="text-orange-400 font-semibold">Notre atelier</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-6">MBX Centre De Réparation Pro</h2>
                <div className="space-y-5 mb-8">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="font-semibold text-white">Adresse</p>
                      <p className="text-gray-300">8 Rue de l'Épée, 69003 Lyon</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📞</span>
                    <div>
                      <p className="font-semibold text-white">Téléphone</p>
                      <p className="text-gray-300">04 72 60 16 13</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">✉️</span>
                    <div>
                      <p className="font-semibold text-white">Email</p>
                      <p className="text-gray-300">mbxmobilax@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⏰</span>
                    <div>
                      <p className="font-semibold text-white">Horaires</p>
                      <p className="text-gray-300">Lundi - vendredi : 10h - 18h</p>
                    </div>
                  </div>
                </div>
                <a
                  href="https://www.google.com/maps?q=8+Rue+de+l'Épée,+69003+Lyon"
                  target="_blank"
                  className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 font-semibold"
                >
                  Voir sur Google Maps →
                </a>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-800">
                <h3 className="text-2xl font-bold text-white mb-4">Contactez-nous</h3>
                <p className="text-gray-400 mb-6">Notre équipe vous répond rapidement</p>
                <form>
                  <input
                    type="text"
                    placeholder="Votre nom"
                    className="w-full px-5 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    placeholder="Votre email"
                    className="w-full px-5 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <textarea
                    rows={4}
                    placeholder="Votre message"
                    className="w-full px-5 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  ></textarea>
                  <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition shadow-md">
                    Envoyer le message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="bg-[#060609] border-t border-white/5 text-gray-400 py-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg overflow-hidden">
                  <img src="/logo.png" alt="MBX" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                </div>
                <span className="text-white font-black tracking-tight">MBX <span className="text-orange-400 font-bold text-xs tracking-widest">CENTRE DE RÉPARATION</span></span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <a href="/client/soumettre-appareil" className="hover:text-orange-400 transition">Déclarer un appareil</a>
                <a href="/suivi-client" className="hover:text-orange-400 transition">Suivi de réparation</a>
                <a href="https://www.mobilax.fr" target="_blank" className="hover:text-orange-400 transition">mobilax.fr</a>
                <a href="https://mobilax-academy.fr/" target="_blank" className="hover:text-orange-400 transition">Formation</a>
              </div>
            </div>
            <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
              <p>© {new Date().getFullYear()} MBX Centre De Réparation Pro — 8 Rue de l'Épée, 69003 Lyon — <a href="tel:0472601613" className="hover:text-orange-400 transition">04 72 60 16 13</a></p>
              <p className="text-gray-600">Lun–Ven 10h–18h · <a href="mailto:mbxmobilax@gmail.com" className="hover:text-orange-400 transition">mbxmobilax@gmail.com</a></p>
            </div>
          </div>
        </footer>

        {/* Modal vidéo YouTube */}
        {showVideo && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setShowVideo(false)}
          >
            <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowVideo(false)}
                className="absolute -top-14 right-0 text-white text-3xl hover:text-orange-400 transition"
              >
                ✕
              </button>
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
        {false && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowTrackingModal(false)}
          >
            <div
              className="relative max-w-md w-full bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-8 border border-orange-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowTrackingModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-orange-400 text-2xl transition"
              >
                ✕
              </button>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-orange-500/30">
                  🔍
                </div>
                <h3 className="text-2xl font-bold text-white">Suivi de réparation</h3>
                <p className="text-gray-400 mt-2">Entrez votre nom et votre code client</p>
              </div>
              <form onSubmit={handleTrackSubmit}>
                <input
                  type="text"
                  value={trackingName}
                  onChange={(e) => setTrackingName(e.target.value)}
                  placeholder="👤 Votre nom (ex: Dupont)"
                  className="w-full px-5 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
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
                Nouveau client ?{" "}
                <a href="/client/soumettre-appareil" className="text-orange-500 hover:underline">
                  Déclarez votre appareil
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bouton scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Retour en haut"
        className={`fixed bottom-24 right-4 z-40 group transition-all duration-500 ${
          showScrollTop ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-6 pointer-events-none"
        }`}
      >
        {/* Anneau rotatif */}
        <span className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 opacity-70 group-hover:opacity-100 blur-sm transition-opacity duration-300 animate-spin-slow" />
        {/* Corps du bouton */}
        <span className="relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_8px_30px_rgba(249,115,22,0.55)] group-hover:shadow-[0_8px_40px_rgba(249,115,22,0.8)] group-hover:scale-110 active:scale-95 transition-all duration-200">
          <svg className="w-5 h-5 text-white group-hover:-translate-y-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          </svg>
        </span>
      </button>

      <AssistantPublic />
      <InstallPWA />
    </Layout>
  );
}
