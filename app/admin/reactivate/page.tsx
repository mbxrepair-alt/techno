"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ReactivateLicence(): JSX.Element {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const reactivate = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        licence_active: true,
        licence_expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq("email", email);

    if (error) {
      setMessage("❌ Erreur: " + error.message);
    } else {
      setMessage("✅ Licence réactivée pour 7 jours !");
    }
    setLoading(false);
  };

  return (
    <div className="p-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Réactiver une licence</h1>
      <input
        type="email"
        placeholder="Email du client"
        className="w-full p-2 border rounded mb-4"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={reactivate}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? "Réactivation..." : "Réactiver la licence"}
      </button>
      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
}
