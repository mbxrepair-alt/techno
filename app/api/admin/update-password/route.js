// app/api/admin/update-password/route.js
import { createClient } from '@supabase/supabase-js';

// Utiliser la clé service_role pour contourner RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId, password } = await request.json();
    
    if (!userId || !password) {
      return Response.json({ success: false, error: "Paramètres manquants" });
    }
    
    // Validation du mot de passe
    if (password.length < 6) {
      return Response.json({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères" });
    }
    
    if (!/[A-Z]/.test(password)) {
      return Response.json({ success: false, error: "Le mot de passe doit contenir au moins une majuscule" });
    }
    
    if (!/[a-z]/.test(password)) {
      return Response.json({ success: false, error: "Le mot de passe doit contenir au moins une minuscule" });
    }
    
    if (!/[0-9]/.test(password)) {
      return Response.json({ success: false, error: "Le mot de passe doit contenir au moins un chiffre" });
    }
    
    // Changer le mot de passe via l'API admin
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: password }
    );
    
    if (error) {
      return Response.json({ success: false, error: error.message });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
}