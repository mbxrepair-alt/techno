"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";

interface Permissions {
  is_gerant?: boolean;
  can_access_repairs?: boolean;
  can_access_clients?: boolean;
  can_access_historique?: boolean;
  can_access_factures?: boolean;
  can_access_paiements?: boolean;
  can_access_statistiques?: boolean;
}

interface User {
  email?: string;
  id?: string;
}

interface NavigationProps {
  user: User;
  permissions: Permissions | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  grad: string;
  glow: string;
  visible: boolean;
}

export default function Navigation({ user, permissions }: NavigationProps) {
  const pathname = usePathname();
  const [isGerant, setIsGerant] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [technicianName, setTechnicianName] = useState("");
  const [companyName, setCompanyName] = useState("MBX Réparations");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    setIsGerant(permissions?.is_gerant === true);

    const techName = sessionStorage.getItem("technician_name");
    if (techName) {
      setTechnicianName(techName);
    } else if (user?.email) {
      setTechnicianName(user.email.split("@")[0]);
    }

    loadCompanyInfo();
  }, [permissions, user]);

  const loadCompanyInfo = async (): Promise<void> => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (currentUser) {
        const { data, error } = await supabase
          .from("profiles")
          .select("company_name, logo_url")
          .eq("id", currentUser.id)
          .single();

        if (data && !error) {
          if (data.company_name) setCompanyName(data.company_name);
          if (data.logo_url) setLogoUrl(data.logo_url);
        }
      }
    } catch (err) {
      console.error("Erreur chargement infos entreprise:", err);
    }
  };

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    document.cookie = "mbx_token=; path=/; max-age=0";
    document.cookie = "mbx_auth_token=; path=/; max-age=0";
    document.cookie = "mbx_company_id=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Tableau de bord",
      icon: "🏠",
      grad: "from-blue-500 to-blue-600",
      glow: "shadow-blue-500/40",
      visible: true,
    },
    {
      href: "/repairs",
      label: "Réparations",
      icon: "🔧",
      grad: "from-orange-500 to-orange-600",
      glow: "shadow-orange-500/40",
      visible: !!(permissions?.can_access_repairs || isGerant),
    },
    {
      href: "/clients",
      label: "Clients",
      icon: "👥",
      grad: "from-emerald-500 to-green-600",
      glow: "shadow-emerald-500/40",
      visible: !!(permissions?.can_access_clients || isGerant),
    },
    {
      href: "/historique",
      label: "Historique",
      icon: "📜",
      grad: "from-amber-500 to-yellow-600",
      glow: "shadow-amber-500/40",
      visible: !!(permissions?.can_access_historique || isGerant),
    },
    {
      href: "/factures",
      label: "Factures",
      icon: "📄",
      grad: "from-purple-500 to-violet-600",
      glow: "shadow-purple-500/40",
      visible: !!(permissions?.can_access_factures || isGerant),
    },
    {
      href: "/paiements",
      label: "Paiements",
      icon: "💳",
      grad: "from-pink-500 to-rose-600",
      glow: "shadow-pink-500/40",
      visible: !!(permissions?.can_access_paiements || isGerant),
    },
    {
      href: "/statistiques",
      label: "Statistiques",
      icon: "📊",
      grad: "from-cyan-500 to-teal-600",
      glow: "shadow-cyan-500/40",
      visible: !!(permissions?.can_access_statistiques || isGerant),
    },
    {
      href: "/settings",
      label: "Paramètres",
      icon: "⚙️",
      grad: "from-gray-500 to-slate-600",
      glow: "shadow-gray-500/40",
      visible: true,
    },
  ];

  const visibleItems = navItems.filter((item) => item.visible);

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen bg-gradient-to-b from-[#16161d] to-[#0f0f13] border-r border-white/5 z-40">

        {/* LOGO */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 p-5 border-b border-white/5 hover:opacity-80 transition-opacity duration-200 shrink-0"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xl shadow-lg shadow-orange-500/30 shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              "🔧"
            )}
          </div>
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-2xl font-black text-white tracking-tight truncate">
              {companyName.split(" ")[0]}
            </span>
            <span className="text-xs font-medium text-orange-400 uppercase tracking-widest mt-0.5">
              {companyName.split(" ").slice(1).join(" ") || "Réparations"}
            </span>
          </div>
        </Link>

        {/* NAV ITEMS */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 select-none",
                  isActive
                    ? `bg-gradient-to-r ${item.grad} text-white shadow-lg ${item.glow}`
                    : "bg-white/5 border border-white/5 text-gray-300 hover:bg-white/10 hover:text-white hover:-translate-y-0.5",
                  "shadow-[0_4px_0_rgba(0,0,0,0.3)]",
                  "active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)]",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-base shrink-0",
                    item.grad,
                    isActive ? "opacity-90" : "opacity-70 group-hover:opacity-100",
                  ].join(" ")}
                >
                  {item.icon}
                </div>
                <span className="text-sm font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* USER PROFILE */}
        <div className="p-3 border-t border-white/5 space-y-2 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-black text-sm ring-2 ring-orange-500/30 shrink-0">
              {technicianName?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {technicianName || "Technicien"}
              </p>
              {isGerant && (
                <span className="text-xs text-orange-400 font-medium">⭐ Gérant</span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all duration-150"
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <nav className="lg:hidden bg-gradient-to-r from-[#16161d] to-[#0f0f13] border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-base shadow-md">
              🔧
            </div>
            <span className="text-lg font-black text-white tracking-tight">
              {companyName.split(" ")[0]}
            </span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-300 text-xl w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="px-3 pb-4 space-y-1.5 border-t border-white/5 pt-3">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={[
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150",
                  "shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.3)]",
                  pathname === item.href
                    ? `bg-gradient-to-r ${item.grad} text-white shadow-lg ${item.glow}`
                    : "bg-white/5 border border-white/5 text-gray-300",
                ].join(" ")}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.grad} flex items-center justify-center text-base shrink-0`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 transition-all duration-150 mt-1"
            >
              🚪 Déconnexion
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
