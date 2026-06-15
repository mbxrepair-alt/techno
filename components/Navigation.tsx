"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Wrench,
  Inbox,
  Users,
  History,
  Receipt,
  Banknote,
  Wallet,
  Package,
  BarChart3,
  Settings,
  LogOut,
  X,
  MoreHorizontal,
  ChevronRight,
  Star,
} from "lucide-react";

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
  icon: React.ElementType;
  color: string;
  activeBg: string;
  visible: boolean;
}

export default function Navigation({ user, permissions }: NavigationProps) {
  const pathname = usePathname();
  const [isGerant, setIsGerant] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [technicianName, setTechnicianName] = useState("");
  const [companyName, setCompanyName] = useState("MBX");
  const [logoUrl, setLogoUrl] = useState("");
  const [receptionsCount, setReceptionsCount] = useState(0);

  useEffect(() => {
    setIsGerant(permissions?.is_gerant === true);
    const techName = localStorage.getItem("technician_name");
    if (techName) setTechnicianName(techName);
    else if (user?.email) setTechnicianName(user.email.split("@")[0]);
    loadCompanyInfo();
    loadReceptionsCount();
  }, [permissions, user]);

  const loadReceptionsCount = async () => {
    try {
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) return;
      const { count } = await supabase
        .from("repairs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", companyId)
        .eq("status", "📤 Envoyé à l'atelier");
      setReceptionsCount(count || 0);
    } catch {}
  };

  const loadCompanyInfo = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("company_name, logo_url")
          .eq("id", currentUser.id)
          .single();
        if (data) {
          if (data.company_name) setCompanyName(data.company_name.split(" ")[0]);
          if (data.logo_url) setLogoUrl(data.logo_url);
        }
      }
    } catch (_) {}
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    document.cookie = "mbx_token=; path=/; max-age=0";
    document.cookie = "mbx_auth_token=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const allNavItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Tableau de bord",
      icon: LayoutDashboard,
      color: "text-blue-400",
      activeBg: "bg-blue-500/15 border-blue-500/30",
      visible: true,
    },
    {
      href: "/repairs",
      label: "Réparations",
      icon: Wrench,
      color: "text-orange-400",
      activeBg: "bg-orange-500/15 border-orange-500/30",
      visible: !!(permissions?.can_access_repairs || isGerant),
    },
    {
      href: "/clients",
      label: "Clients",
      icon: Users,
      color: "text-emerald-400",
      activeBg: "bg-emerald-500/15 border-emerald-500/30",
      visible: !!(permissions?.can_access_clients || isGerant),
    },
    {
      href: "/receptions",
      label: "Réceptions",
      icon: Inbox,
      color: "text-pink-400",
      activeBg: "bg-pink-500/15 border-pink-500/30",
      visible: !!(permissions?.can_access_repairs || isGerant),
    },
    {
      href: "/historique",
      label: "Historique",
      icon: History,
      color: "text-amber-400",
      activeBg: "bg-amber-500/15 border-amber-500/30",
      visible: !!(permissions?.can_access_historique || isGerant),
    },
    {
      href: "/factures",
      label: "Factures",
      icon: Receipt,
      color: "text-violet-400",
      activeBg: "bg-violet-500/15 border-violet-500/30",
      visible: !!(permissions?.can_access_factures || isGerant),
    },
    {
      href: "/paiements",
      label: "Paiements",
      icon: Banknote,
      color: "text-green-400",
      activeBg: "bg-green-500/15 border-green-500/30",
      visible: !!(permissions?.can_access_paiements || isGerant),
    },
    {
      href: "/boutique",
      label: "Stock",
      icon: Package,
      color: "text-fuchsia-400",
      activeBg: "bg-fuchsia-500/15 border-fuchsia-500/30",
      visible: !!(permissions?.can_access_repairs || isGerant),
    },
    {
      href: "/statistiques",
      label: "Statistiques",
      icon: BarChart3,
      color: "text-cyan-400",
      activeBg: "bg-cyan-500/15 border-cyan-500/30",
      visible: !!(permissions?.can_access_statistiques || isGerant),
    },
    {
      href: "/paie",
      label: "Paie",
      icon: Wallet,
      color: "text-lime-400",
      activeBg: "bg-lime-500/15 border-lime-500/30",
      visible: isGerant,
    },
    {
      href: "/settings",
      label: "Paramètres",
      icon: Settings,
      color: "text-gray-400",
      activeBg: "bg-white/10 border-white/20",
      visible: true,
    },
  ];

  const visibleItems = allNavItems.filter((i) => i.visible);

  // Mobile bottom nav: 4 first items + "Plus"
  const bottomPrimary = visibleItems.slice(0, 4);
  const bottomMore = visibleItems.slice(4);

  const isMoreActive = bottomMore.some((i) => pathname === i.href);

  return (
    <>
      {/* ═══════════════════════════════════════
          DESKTOP SIDEBAR
      ═══════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen bg-[#0f0f13] border-r border-white/5 z-40">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-4 border-b border-white/5 hover:opacity-80 transition-opacity shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Wrench size={18} className="text-orange-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-base font-black text-white tracking-tight truncate leading-tight">{companyName}</div>
            <div className="text-[10px] font-semibold text-orange-400/70 uppercase tracking-widest">Réparations</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                  isActive
                    ? `${item.activeBg} border ${item.color}`
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/5 border border-transparent",
                ].join(" ")}
              >
                <Icon
                  size={17}
                  className={[
                    "shrink-0 transition-all",
                    isActive ? item.color : "group-hover:text-gray-300",
                  ].join(" ")}
                />
                <span className={`text-sm font-medium truncate ${isActive ? "text-white" : ""}`}>
                  {item.label}
                </span>
                {item.href === "/receptions" && receptionsCount > 0 ? (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {receptionsCount}
                  </span>
                ) : isActive ? (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full ${item.color.replace("text-", "bg-")}`} />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-2.5 pb-3 border-t border-white/5 pt-3 space-y-1.5 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/3 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-orange-400 font-black text-xs shrink-0">
              {technicianName?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{technicianName || "Technicien"}</p>
              {isGerant && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star size={9} className="text-orange-400 fill-orange-400" />
                  <span className="text-[10px] text-orange-400 font-medium">Gérant</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 text-red-400 hover:text-red-300 font-semibold text-xs transition-all"
          >
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          MOBILE TOP BAR (title only)
      ═══════════════════════════════════════ */}
      <header className="lg:hidden bg-[#0f0f13]/95 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-13">
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                : <Wrench size={14} className="text-orange-400" />
              }
            </div>
            <span className="text-base font-black text-white tracking-tight">{companyName}</span>
          </Link>

          {/* Current page label */}
          <div className="text-xs font-medium text-gray-500">
            {visibleItems.find(i => pathname === i.href || pathname.startsWith(i.href + "/"))?.label ?? ""}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          MOBILE BOTTOM NAV
      ═══════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0f0f13]/95 backdrop-blur-xl border-t border-white/8 pb-safe">
        <div className="flex items-stretch h-16">
          {bottomPrimary.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? item.activeBg + " border" : ""}`}>
                  <Icon size={20} className={isActive ? item.color : "text-gray-600"} />
                  {item.href === "/receptions" && receptionsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
                      {receptionsCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-none ${isActive ? "text-white" : "text-gray-600"}`}>
                  {item.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          {bottomMore.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
            >
              <div className={`p-1.5 rounded-xl transition-all ${isMoreActive || moreOpen ? "bg-white/10 border border-white/20" : ""}`}>
                <MoreHorizontal size={20} className={isMoreActive || moreOpen ? "text-white" : "text-gray-600"} />
              </div>
              <span className={`text-[10px] font-medium leading-none ${isMoreActive || moreOpen ? "text-white" : "text-gray-600"}`}>
                Plus
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════
          MOBILE "PLUS" BOTTOM SHEET
      ═══════════════════════════════════════ */}
      {moreOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setMoreOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-[70] bg-[#16161d] border-t border-white/8 rounded-t-3xl overflow-hidden animate-slideUp pb-safe">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 px-5 py-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-orange-400 font-black text-sm">
                {technicianName?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{technicianName || "Technicien"}</div>
                {isGerant && (
                  <div className="flex items-center gap-1">
                    <Star size={10} className="text-orange-400 fill-orange-400" />
                    <span className="text-xs text-orange-400">Gérant</span>
                  </div>
                )}
              </div>
              <button onClick={() => setMoreOpen(false)} className="ml-auto text-gray-600 p-1.5 rounded-xl hover:bg-white/8">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 pb-2 space-y-0.5">
              {bottomMore.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={[
                      "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all",
                      isActive
                        ? `${item.activeBg} border ${item.color}`
                        : "text-gray-400 hover:bg-white/5 border border-transparent",
                    ].join(" ")}
                  >
                    <Icon size={20} className={isActive ? item.color : ""} />
                    <span className={`text-sm font-semibold flex-1 ${isActive ? "text-white" : ""}`}>{item.label}</span>
                    <ChevronRight size={14} className="text-gray-700" />
                  </Link>
                );
              })}

              {/* Déconnexion */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-red-500/8 hover:bg-red-500/15 border border-red-500/10 text-red-400 transition-all mt-2"
              >
                <LogOut size={20} />
                <span className="text-sm font-semibold flex-1 text-left">Déconnexion</span>
              </button>
            </div>

            {/* Safe area bottom */}
            <div className="h-4" />
          </div>
        </>
      )}
    </>
  );
}
