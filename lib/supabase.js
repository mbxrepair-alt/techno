// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create a placeholder client if env vars are not set
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client that won't throw errors during SSR/build
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: { message: 'Supabase not configured' } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
            order: () => ({
              range: async () => ({ data: [], error: null, count: 0 }),
            }),
          }),
          order: () => ({
            range: async () => ({ data: [], error: null, count: 0 }),
          }),
          single: async () => ({ data: null, error: null }),
        }),
        insert: async () => ({ data: null, error: null }),
        update: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
        delete: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
      }),
      rpc: async () => ({ data: null, error: null }),
    }
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export const supabase = createSupabaseClient()

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

// Récupérer l'utilisateur courant
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Récupérer l'ID de l'utilisateur courant
export const getCurrentUserId = async () => {
  const user = await getCurrentUser()
  return user?.id
}

// Récupérer le profil de l'utilisateur courant
export const getCurrentProfile = async () => {
  const user = await getCurrentUser()
  if (!user) return null
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  
  if (error) {
    console.error("Erreur récupération profil:", error)
    return null
  }
  
  return profile
}

// Vérifier si l'utilisateur est admin
export const isAdmin = async () => {
  const profile = await getCurrentProfile()
  return profile?.is_admin === true
}

// Générer un fingerprint d'appareil
export const generateDeviceFingerprint = () => {
  if (typeof window === 'undefined') return 'server_side'
  
  let fingerprint = localStorage.getItem("device_fingerprint")
  if (!fingerprint) {
    fingerprint = `${navigator.userAgent}_${navigator.language}_${screen.width}x${screen.height}_${Date.now()}`
    localStorage.setItem("device_fingerprint", fingerprint)
  }
  return fingerprint
}

// Vérifier la licence ou l'essai gratuit
export const checkDeviceLicense = async (email, deviceFingerprint) => {
  try {
    // 1. Vérifier si c'est un admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("email", email)
      .single();

    if (profile?.is_admin === true) {
      return { authorized: true, isAdmin: true };
    }

    // 2. Vérifier la licence
    const { data: licence, error } = await supabase
      .from("licences")
      .select("*")
      .eq("email", email)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Erreur recherche licence:", error);
      return { authorized: false, reason: "error" };
    }

    // 3. Vérifier l'essai gratuit
    if (licence?.is_trial) {
      const trialEnd = new Date(licence.trial_end_date);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0) {
        // Essai encore valide
        await supabase
          .from("licences")
          .update({ last_login: new Date().toISOString() })
          .eq("id", licence.id);
        
        return { authorized: true, isTrial: true, daysLeft: daysLeft };
      } else {
        // Essai expiré
        await supabase
          .from("licences")
          .update({ status: "expired" })
          .eq("id", licence.id);
        
        return { authorized: false, reason: "trial_expired", daysLeft: 0 };
      }
    }

    // 4. Pas de licence
    if (!licence) {
      return { authorized: false, reason: "no_license" };
    }

    // 5. Vérification normale
    await supabase
      .from("licences")
      .update({ last_login: new Date().toISOString() })
      .eq("id", licence.id);

    return { authorized: true, licence };

  } catch (error) {
    console.error("Erreur vérification licence:", error);
    return { authorized: false, reason: "error" };
  }
};

// Vérifier le statut d'un essai gratuit
export const checkTrialStatus = async (email) => {
  try {
    const { data: licence, error } = await supabase
      .from("licences")
      .select("*")
      .eq("email", email)
      .eq("is_trial", true)
      .single();

    if (error || !licence) return { isValid: false, daysLeft: 0 };

    const trialEnd = new Date(licence.trial_end_date);
    const now = new Date();
    const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));

    return {
      isValid: daysLeft > 0,
      daysLeft: daysLeft,
      trialEndDate: licence.trial_end_date,
      isExpired: daysLeft === 0
    };
  } catch (error) {
    console.error("Erreur vérification essai:", error);
    return { isValid: false, daysLeft: 0 };
  }
};

// Envoyer un email de réinitialisation
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Erreur réinitialisation:", error);
    return { success: false, error: error.message };
  }
};
