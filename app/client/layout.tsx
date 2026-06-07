"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface ClientLayoutProps {
  children: React.ReactNode;
}

const PUBLIC_PREFIXES = [
  "/client/soumettre-appareil",
  "/client/tickets",
  "/client/ticket",
  "/client/repairs",
  "/client/code",
];

export default function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (PUBLIC_PREFIXES.some(page => pathname?.startsWith(page))) return;
    const token = localStorage.getItem("clientToken");
    const clientCode = localStorage.getItem("clientCode");
    if (!token || !clientCode) router.push("/login");
  }, [router, pathname]);

  return <>{children}</>;
}
