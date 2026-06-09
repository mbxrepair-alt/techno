"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import Navigation from "./Navigation";
import AssistantPro from "./AssistantPro";
import InstallPWA from "./InstallPWA";

interface LayoutProps {
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

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const techPermissions = sessionStorage.getItem("technician_permissions");
      if (techPermissions) {
        setPermissions(JSON.parse(techPermissions));
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading && !user && !isPublic(pathname)) {
      router.push("/login");
    }
  }, [loading, user, pathname, router]);

  // Public routes: bare children, no pro chrome
  if (isPublic(pathname)) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-orange-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return <></>;

  return (
    <div className="min-h-screen bg-[#1a1d2e] lg:flex lg:items-start">
      <Navigation user={user} permissions={permissions} />
      <main className="flex-1 min-w-0 px-6 py-6 overflow-x-hidden">{children}</main>
      <InstallPWA />
      <AssistantPro />
    </div>
  );
}
