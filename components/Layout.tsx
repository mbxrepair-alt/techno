"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import Navigation from "./Navigation";
import Chatbot from "./Chatbot";
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
  const [showChatbot, setShowChatbot] = useState(false);

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
    <div className="min-h-screen bg-gray-100">
      <Navigation user={user} permissions={permissions} />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <button
        onClick={() => setShowChatbot(!showChatbot)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group animate-bounce-slow"
      >
        <div className="relative">
          <span className="text-2xl group-hover:animate-pulse">🤖</span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        </div>
      </button>
      <InstallPWA />
      <Chatbot isOpen={showChatbot} onClose={() => setShowChatbot(false)} />
    </div>
  );
}
