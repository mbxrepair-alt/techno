import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const isSupabaseConfigured = () => true

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getCurrentUserId = async () => {
  const user = await getCurrentUser()
  return user?.id
}

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

export const isAdmin = async () => {
  const profile = await getCurrentProfile()
  return profile?.is_admin === true
}

export const generateDeviceFingerprint = () => {
  if (typeof window === 'undefined') return 'server_side'

  let fingerprint = localStorage.getItem("device_fingerprint")
  if (!fingerprint) {
    fingerprint = `${navigator.userAgent}_${navigator.language}_${screen.width}x${screen.height}_${Date.now()}`
    localStorage.setItem("device_fingerprint", fingerprint)
  }
  return fingerprint
}

export const checkDeviceLicense = async (email, deviceFingerprint) => {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("email", email)
      .single();

    if (profile?.is_admin === true) {
      return { authorized: true, isAdmin: true };
    }

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

    if (licence?.is_trial) {
      const trialEnd = new Date(licence.trial_end_date);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

      if (daysLeft > 0) {
        await supabase
          .from("licences")
          .update({ last_login: new Date().toISOString() })
          .eq("id", licence.id);
        return { authorized: true, isTrial: true, daysLeft: daysLeft };
      } else {
        await supabase
          .from("licences")
          .update({ status: "expired" })
          .eq("id", licence.id);
        return { authorized: false, reason: "trial_expired", daysLeft: 0 };
      }
    }

    if (!licence) {
      return { authorized: false, reason: "no_license" };
    }

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
