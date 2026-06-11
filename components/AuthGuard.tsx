"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/suivi",
  "/client/repairs",
  "/client/code",
  "/client/soumettre-appareil",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  });
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      if (isPublic(pathname)) {
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      try {
        const techPermissions = localStorage.getItem("technician_permissions");
        const companyId = localStorage.getItem("company_id");
        const hasCookie = document.cookie.includes("mbx_token");
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (techPermissions && companyId && hasCookie && user) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("technician_permissions");
          localStorage.removeItem("technician_name");
          localStorage.removeItem("company_id");
          document.cookie = "mbx_token=; path=/; max-age=0";
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
          <p className="mt-4 text-white">Vérification des droits d&apos;accès...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}
