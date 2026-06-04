import { supabase } from "./supabase";

export async function addLog({ action, technicienId, technicienName, companyId, details = {} }) {
  try {
    const userAgent = typeof window !== "undefined" ? navigator.userAgent : "server";
    
    const { error } = await supabase.from("technicien_logs").insert([{
      technicien_id: technicienId,
      technicien_name: technicienName,
      company_id: companyId,
      action: action,
      details: details,
      ip_address: "client-side",
      user_agent: userAgent
    }]);
    
    if (error) console.error("Erreur log:", error);
  } catch (err) {
    console.error("Erreur ajout log:", err);
  }
}

export async function getLogs(companyId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from("technicien_logs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Erreur récupération logs:", err);
    return [];
  }
}
