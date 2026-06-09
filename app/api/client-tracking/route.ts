import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service role key bypasses RLS — repairs table blocks anon reads
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  const name = searchParams.get("name")?.trim();

  if (!code || !name) {
    return NextResponse.json({ error: "code et name requis" }, { status: 400 });
  }

  // 1. Find client by code + name (case-insensitive partial match)
  const { data: clientData, error: clientError } = await supabaseAdmin
    .from("clients")
    .select("id, name, client_code, phone")
    .eq("client_code", code)
    .ilike("name", `%${name}%`)
    .maybeSingle();

  if (clientError) {
    console.error("[client-tracking] Supabase error:", clientError.code, clientError.message, clientError.details);
    return NextResponse.json({ error: "Erreur serveur", debug: { code: clientError.code, message: clientError.message } }, { status: 500 });
  }

  if (!clientData) {
    return NextResponse.json({ error: "Aucun client trouvé" }, { status: 404 });
  }

  // 2. Fetch repairs — explicitly exclude price fields
  const { data: repairsData, error: repairsError } = await supabaseAdmin
    .from("repairs")
    .select(
      "id, device, issue, status, created_at, technician_name, diagnosis, repair_description, description, photos, client_response, client_response_type, imei"
    )
    .eq("client_id", clientData.id)
    .order("created_at", { ascending: false });

  if (repairsError) {
    return NextResponse.json({ error: repairsError.message }, { status: 500 });
  }

  return NextResponse.json({ client: clientData, repairs: repairsData || [] });
}
