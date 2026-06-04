"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Pages publiques (pas de protection)
      const publicPages = ["/login", "/register", "/reset-password"];
      
      if (publicPages.includes(pathname)) {
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      try {
        // 1. Vérifier sessionStorage
        const techPermissions = sessionStorage.getItem("technician_permissions");
        const companyId = sessionStorage.getItem("company_id");
        const technicianName = sessionStorage.getItem("technician_name");
        
        // 2. Vérifier les cookies
        const hasCookie = document.cookie.includes("mbx_auth_token");
        
        // 3. Vérifier Supabase
        const { data: { user } } = await supabase.auth.getUser();
        
        if (techPermissions && companyId && hasCookie && user) {
          setIsAuthenticated(true);
        } else {
          // Nettoyer les données obsolètes
          sessionStorage.removeItem("technician_permissions");
          sessionStorage.removeItem("technician_name");
          sessionStorage.removeItem("company_id");
          
          // Supprimer les cookies
          document.cookie = "mbx_auth_token=; path=/; max-age=0";
          document.cookie = "mbx_company_id=; path=/; max-age=0";
          document.cookie = "mbx_technician_name=; path=/; max-age=0";
          
          router.push("/login");
        }
      } catch (err) {
        console.error("Erreur AuthGuard:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Vérification des droits d'accès...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
}
