import { createClient } from "@supabase/supabase-js";

export async function getUserFromToken(token) {
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!session) return null;

  const { data: user } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user_id)
    .single();

  return user;
}