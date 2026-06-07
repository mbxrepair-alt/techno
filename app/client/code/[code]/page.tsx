// app/client/code/[code]/page.js
"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function ClientCodePage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { code } = use(params);

  useEffect(() => {
    const fetchClient = async () => {
      if (!code) {
        setError("Code client invalide");
        setLoading(false);
        return;
      }

      console.log("Recherche client avec code:", code);

      const { data: client, error } = await supabase
        .from("clients")
        .select("id, email, name, client_code")
        .eq("client_code", code.toUpperCase())
        .single();

      console.log("Résultat:", client, error);

      if (error || !client) {
        setError("Code client invalide");
        setLoading(false);
        return;
      }

      // Rediriger vers une page qui utilise l'ID client directement
      router.push(`/client/repairs/${client.id}`);
    };

    fetchClient();
  }, [code, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification de votre code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Code invalide</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return null;
}
