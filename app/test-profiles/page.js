"use client";

import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";

export default function TestProfiles() {
  const [result, setResult] = useState("");

  useEffect(() => {
    testProfiles();
  }, []);

  const testProfiles = async () => {
    setResult("Test en cours...");
    
    try {
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setResult("❌ Non connecté");
        return;
      }
      
      setResult(prev => prev + "\n✅ Utilisateur: " + user.id);
      
      // Tenter la requête profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, contact_phone, contact_address, email")
        .eq("id", user.id);
      
      if (error) {
        setResult(prev => prev + "\n❌ Erreur: " + error.message);
      } else {
        setResult(prev => prev + "\n✅ Succès: " + JSON.stringify(data));
      }
    } catch (err) {
      setResult(prev => prev + "\n❌ Exception: " + err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Test Profiles</h1>
      <pre style={{ background: "#f0f0f0", padding: 15 }}>{result}</pre>
    </div>
  );
}
