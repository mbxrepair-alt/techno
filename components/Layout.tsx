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
      // Source de vérité = permissions technicien en localStorage, écrites au
      // login et persistées comme le cookie mbx_token (24h) utilisé par le
      // middleware. On NE bloque PAS l'affichage sur la session Supabase Auth
      // (qui expire en ~1h) : c'était la cause de l'écran noir intermittent.
      let perms: Record<string, any> | null = null;
      try {
        const techPermissions = localStorage.getItem("technician_permissions");
        if (techPermissions) {
          perms = JSON.parse(techPermissions);
          setPermissions(perms);
        }
      } catch {
        // valeur corrompue → on ignore
      }

      // Session Supabase lue en parallèle, avec garde-temps : sert à récupérer
      // l'user.id quand elle est fraîche, mais ne doit jamais bloquer le rendu.
      let supaUser: any = null;
      try {
        const res: any = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        supaUser = res?.data?.session?.user ?? null;
      } catch {
        // ignore : on retombe sur les permissions locales
      }

      if (supaUser) {
        setUser(supaUser);
      } else if (perms?.id) {
        // Session Supabase absente/expirée mais technicien connecté (cookie 24h)
        setUser({ id: perms.id, email: perms.name });
      } else {
        setUser(null);
      }
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

  // Pas d'utilisateur : la redirection vers /login est gérée par l'effet
  // ci-dessus. On affiche le spinner en attendant plutôt qu'un écran noir vide.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-orange-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] lg:flex lg:items-start">
      <Navigation user={user} permissions={permissions} />
      <main className="flex-1 min-w-0 px-4 lg:px-6 py-4 lg:py-6 pb-24 lg:pb-6 overflow-x-hidden">{children}</main>
      <InstallPWA />
      <AssistantPro />
    </div>
  );
}
