"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isPublic = ["/login", "/register", "/client"].some(p => pathname?.startsWith(p));

      if (!session && !isPublic) {
        router.replace("/login");
        setLoading(false);
        return;
      }

      if (session && !isPublic) {
        // Vérifier licence
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("licence_active, licence_expiry_date")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          // Peut-être que le trigger n'a pas encore créé le profil -> on le crée maintenant
          if (error?.message?.includes("no rows")) {
            await supabase.from("profiles").insert({
              id: session.user.id,
              email: session.user.email,
              licence_active: true,
              licence_expiry_date: new Date(Date.now() + 7*24*60*60*1000).toISOString()
            });
          } else {
            console.error("Erreur profil:", error);
            await supabase.auth.signOut();
            router.replace("/login");
            setLoading(false);
            return;
          }
        } else {
          const now = new Date();
          const expiry = profile.licence_expiry_date ? new Date(profile.licence_expiry_date) : null;
          if (!profile.licence_active || (expiry && expiry < now)) {
            await supabase.auth.signOut();
            router.replace("/login?expired=true");
            setLoading(false);
            return;
          }
        }
      }

      if (session && pathname === "/login") {
        router.replace("/dashboard");
      }

      setLoading(false);
    };

    check();
  }, [pathname, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">🔧 Chargement...</div>;
  }

  return children;
}