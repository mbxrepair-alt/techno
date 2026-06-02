"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Pages publiques qui ne nécessitent PAS d'authentification
    const publicPages = [
      "/client/soumettre-appareil",
      "/client/tickets",
      "/client/ticket",
      "/client/repairs",
      "/client/code"
    ];
    
    // Si la page actuelle est une page publique, on ne vérifie pas l'auth
    if (publicPages.some(page => pathname?.startsWith(page))) {
      return;
    }

    // Vérification de l'authentification pour les autres pages client
    const token = localStorage.getItem("clientToken");
    const clientCode = localStorage.getItem("clientCode");

    if (!token || !clientCode) {
      router.push("/login");
    }
  }, [router, pathname]);

  return <>{children}</>;
}