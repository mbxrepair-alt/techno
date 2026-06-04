"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import Navigation from "./Navigation";
import AuthGuard from "./AuthGuard";

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  // Redirection dans useEffect pour éviter l'erreur React
  useEffect(() => {
    if (!loading && !user && pathname !== "/login" && pathname !== "/register") {
      router.push("/login");
    }
  }, [loading, user, pathname, router]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error("Erreur checkUser:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Erreur déconnexion:", error);
      } else {
        // Nettoyer sessionStorage
        sessionStorage.clear();
        
        // Supprimer les cookies
        document.cookie = "mbx_auth_token=; path=/; max-age=0";
        document.cookie = "mbx_company_id=; path=/; max-age=0";
        document.cookie = "mbx_technician_name=; path=/; max-age=0";
        document.cookie = "mbx_technician_id=; path=/; max-age=0";
        
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Exception déconnexion:", err);
    }
  };

  // Pages sans layout
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation user={user} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-8">
        <AuthGuard>
          {children}
        </AuthGuard>
      </main>
    </div>
  );
}
