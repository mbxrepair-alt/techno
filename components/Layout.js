"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import Navigation from "./Navigation";
import Chatbot from "./Chatbot";

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);

  // Pages publiques
  const publicPages = ["/", "/login", "/register", "/reset-password"];

  useEffect(() => {
    const checkAuth = async () => {
      const techPermissions = sessionStorage.getItem("technician_permissions");
      if (techPermissions) {
        setPermissions(JSON.parse(techPermissions));
      }

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Redirection si non connecté sur page protégée
  useEffect(() => {
    if (!loading && !user && !publicPages.includes(pathname)) {
      router.push("/login");
    }
  }, [loading, user, pathname, router]);

  // Page publique : afficher juste les enfants (MAIS avec chatbot)
  if (publicPages.includes(pathname)) {
    return (
      <>
        {children}
        {/* 🤖 BOUTON CHATBOT FLOATING - DISPONIBLE PARTOUT */}
        <button
          onClick={() => setShowChatbot(!showChatbot)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group animate-bounce-slow"
        >
          <div className="relative">
            <span className="text-2xl group-hover:animate-pulse">🤖</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          </div>
        </button>
        <Chatbot isOpen={showChatbot} onClose={() => setShowChatbot(false)} />
      </>
    );
  }

  // Chargement
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

  // Non connecté
  if (!user) {
    return null;
  }

  // Page protégée avec navigation + chatbot
  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation user={user} permissions={permissions} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* 🤖 BOUTON CHATBOT FLOATING */}
      <button
        onClick={() => setShowChatbot(!showChatbot)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group animate-bounce-slow"
      >
        <div className="relative">
          <span className="text-2xl group-hover:animate-pulse">🤖</span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        </div>
      </button>
      
      <Chatbot isOpen={showChatbot} onClose={() => setShowChatbot(false)} />
    </div>
  );
}