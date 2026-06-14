import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ticket")?.trim().toUpperCase().replace(/^MBX-?/i, "");
  const id = parseInt(raw || "", 10);

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "Numéro de ticket invalide" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("repairs")
    .select("id, device, issue, status, created_at, technician, diagnostic_technicien, repair_description, risks, photos, client_response, client_response_type, imei, estimated_price, final_price, diagnostic_price, clients(name, phone, client_code)")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

  return NextResponse.json({ repair: data });
}
