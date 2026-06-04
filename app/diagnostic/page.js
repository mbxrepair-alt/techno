"use client";

import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";

export default function EnvTest() {
  const [info, setInfo] = useState({});
  const [result, setResult] = useState("");

  useEffect(() => {
    setInfo({
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseClient: !!supabase,
    });
  }, []);

  const testDirect = async () => {
    setResult("Test en cours...");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@repairshop.com",
        password: "Admin123456"
      });
      
      if (error) {
        setResult("❌ Erreur: " + error.message);
      } else if (data?.user) {
        setResult("✅ Succès! Utilisateur: " + data.user.email + "\nRedirection vers dashboard...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        setResult("❌ Réponse inattendue");
      }
    } catch (err) {
      setResult("❌ Exception: " + err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Diagnostic MBX Réparations</h1>
      <h3>Configuration:</h3>
      <pre>{JSON.stringify(info, null, 2)}</pre>
      
      <button onClick={testDirect} style={{ marginTop: 20, padding: 10, background: "blue", color: "white", border: "none", borderRadius: 5 }}>
        Tester connexion directe
      </button>
      
      {result && (
        <div style={{ marginTop: 20, padding: 15, background: "#f0f0f0", borderRadius: 5 }}>
          <strong>Résultat:</strong>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
