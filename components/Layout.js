"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔑 PAGES PUBLIQUES (accessibles sans connexion)
  const publicPages = ["/", "/login", "/register", "/reset-password"];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, []);

  // ✅ Si on est sur une page publique, on affiche juste les enfants (sans vérification)
  if (publicPages.includes(pathname)) {
    return <>{children}</>;
  }

  // 🔒 Pour les pages protégées, on vérifie l'authentification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Ici votre Navigation pour l'espace pro */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
