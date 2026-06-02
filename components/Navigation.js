"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUser(data.user);
          
          const { data: profileData } = await supabase
            .from("profiles")
            .select("is_admin, logo_url, name, shop_name")
            .eq("id", data.user.id)
            .single();
          
          setProfile(profileData);
          setIsAdmin(profileData?.is_admin === true || data.user.email === 'mbxrepair@gmail.com');
        }
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Liste des menus - SANS "Reçus"
  const navItems = [
    { path: "/dashboard", name: "Dashboard", icon: "📊" },
    { path: "/repairs", name: "Réparations", icon: "🔧" },
    { path: "/clients", name: "Clients", icon: "👥" },
    { path: "/historique", name: "Historique", icon: "📜" },
    { path: "/factures", name: "Factures", icon: "💰" },
    // "Reçus" a été supprimé de la liste
  ];

  const adminItems = [
    { path: "/admin/users", name: "Admin", icon: "👑" },
  ];

  return (
    <nav className="bg-white shadow-md border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center gap-3">
            {profile?.logo_url ? (
              <div className="relative w-8 h-8">
                <Image
                  src={profile.logo_url}
                  alt="Logo"
                  width={32}
                  height={32}
                  sizes="32px"
                  className="object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🔧</span>
              </div>
            )}
            <span className="font-bold text-xl text-gray-800 hidden sm:block">
              {profile?.shop_name || "MBXrepair"}
            </span>
          </Link>

          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-2 rounded-lg transition ${
                  pathname === item.path
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.icon} {item.name}
              </Link>
            ))}
            
            {isAdmin && !loading && (
              adminItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-2 rounded-lg transition ${
                    pathname === item.path
                      ? "bg-purple-700 text-white"
                      : "text-purple-600 hover:bg-purple-50"
                  }`}
                >
                  {item.icon} {item.name}
                </Link>
              ))
            )}
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden md:block">
                {user.email}
              </span>
              {isAdmin && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}