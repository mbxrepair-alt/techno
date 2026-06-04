"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Navigation({ user, onLogout }) {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: "MBX Réparations",
    logo: "🔧",
    logoUrl: null
  });

  useEffect(() => {
    const perms = sessionStorage.getItem("technician_permissions");
    if (perms) {
      setPermissions(JSON.parse(perms));
    }
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("company_name, logo_url")
          .eq("id", user.id)
          .single();
        
        if (data && !error) {
          setCompanyInfo({
            name: data.company_name || "MBX Réparations",
            logo: data.logo_url ? "img" : "🔧",
            logoUrl: data.logo_url || null
          });
        }
      }
    } catch (err) {
      console.error("Erreur chargement infos entreprise:", err);
    }
  };

  const isGerant = permissions?.is_gerant === true;

  const navItems = [
    { href: "/dashboard", label: "🏠 Tableau de bord", require: true },
    { href: "/repairs", label: "🔧 Réparations", require: permissions?.can_access_repairs || isGerant },
    { href: "/clients", label: "👥 Clients", require: permissions?.can_access_clients || isGerant },
    { href: "/historique", label: "📜 Historique", require: permissions?.can_access_historique || isGerant },
    { href: "/factures", label: "📄 Factures", require: permissions?.can_access_factures || isGerant },
    { href: "/paiements", label: "💳 Paiements", require: permissions?.can_access_paiements || isGerant },
    { href: "/statistiques", label: "📊 Statistiques", require: permissions?.can_access_statistiques || isGerant },
    { href: "/settings", label: "⚙️ Paramètres", require: true },
  ];

  const visibleItems = navItems.filter(item => item.require);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo et nom de l'entreprise dynamique avec PNG support */}
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-blue-600">
            {companyInfo.logoUrl ? (
              <img src={companyInfo.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-2xl">{companyInfo.logo}</span>
            )}
            <span>{companyInfo.name}</span>
          </Link>
          
          <div className="hidden md:flex space-x-6">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  pathname === item.href
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              👤 {user?.email?.split("@")[0]}
            </span>
            {permissions?.is_gerant && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Gérant
              </span>
            )}
            <button
              onClick={onLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600 transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
