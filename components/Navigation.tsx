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
  visible: boolean;
}

export default function Navigation({ user, permissions }: NavigationProps): JSX.Element {
  const pathname = usePathname();
  const [isGerant, setIsGerant] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
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
    document.cookie = "mbx_auth_token=; path=/; max-age=0";
    document.cookie = "mbx_company_id=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Tableau de bord", icon: "🏠", visible: true },
    { href: "/repairs", label: "Réparations", icon: "🔧", visible: !!(permissions?.can_access_repairs || isGerant) },
    { href: "/clients", label: "Clients", icon: "👥", visible: !!(permissions?.can_access_clients || isGerant) },
    { href: "/historique", label: "Historique", icon: "📜", visible: !!(permissions?.can_access_historique || isGerant) },
    { href: "/factures", label: "Factures", icon: "📄", visible: !!(permissions?.can_access_factures || isGerant) },
    { href: "/paiements", label: "Paiements", icon: "💳", visible: !!(permissions?.can_access_paiements || isGerant) },
    { href: "/statistiques", label: "Statistiques", icon: "📊", visible: !!(permissions?.can_access_statistiques || isGerant) },
    { href: "/settings", label: "Paramètres", icon: "⚙️", visible: true },
  ];

  const visibleItems = navItems.filter(item => item.visible);

  return (
    <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-2xl sticky top-0 z-50 border-b border-orange-500/30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          <Link href="/dashboard" className="group relative flex items-center gap-2 transition-all duration-300 hover:scale-105">
            <div className="relative">
              <div className="absolute -inset-1 bg-orange-500 rounded-full blur-md opacity-0 group-hover:opacity-100 transition duration-300"></div>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="relative w-8 h-8 object-contain rounded-lg" />
              ) : (
                <span className="relative text-2xl drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(249,115,22,0.8)] transition-all duration-300">
                  🔧
                </span>
              )}
            </div>
            <span className="bg-gradient-to-r from-white to-orange-400 bg-clip-text text-transparent font-black text-lg hidden sm:inline">
              {companyName}
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href;
              const isHovered = hoveredItem === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`group relative px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                      : "text-gray-300 hover:text-white"
                  }`}
                  style={{ transform: isHovered ? "translateY(-2px) scale(1.05)" : "translateY(0) scale(1)" }}
                >
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 opacity-0 transition-opacity duration-300 ${isHovered && !isActive ? "opacity-20" : ""}`}></div>
                  <div className="relative flex items-center gap-2">
                    <span className="text-lg transition-all duration-300 inline-block" style={{ transform: isHovered ? "scale(1.2) translateX(-2px)" : "scale(1) translateX(0)" }}>
                      {item.icon}
                    </span>
                    <span className="text-sm transition-all duration-300" style={{ transform: isHovered ? "translateX(2px)" : "translateX(0)" }}>
                      {item.label}
                    </span>
                  </div>
                  <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-300 ${isHovered ? "w-1/2 opacity-100" : "w-0 opacity-0"}`}></div>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full blur-md opacity-0 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-orange-500/30">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {technicianName?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-white">{technicianName || "Technicien"}</p>
                  {isGerant && <p className="text-xs text-orange-400">⭐ Gérant</p>}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition duration-300"></span>
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-lg group-hover:scale-110 transition-transform duration-300">🚪</span>
                <span className="hidden sm:inline">Déconnexion</span>
              </span>
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-white text-2xl">☰</button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-orange-500/30">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  pathname === item.href ? "bg-orange-500/20 text-orange-400" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
