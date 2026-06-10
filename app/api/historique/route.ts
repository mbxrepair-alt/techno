import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Client admin (service role) — bypasse RLS, utilisé uniquement server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      entity_type,
      entity_id,
      action,
      description,
      old_value,
      new_value,
      user_type,
      user_name,
    } = body;

    const { data, error } = await supabaseAdmin.from("historique").insert([
      {
        entity_type: entity_type ?? "appareil",
        entity_id: String(entity_id),
        action,
        description,
        old_value: old_value ?? null,
        new_value: new_value ?? null,
        user_type: user_type ?? "technicien",
        user_name: user_name ?? "Inconnu",
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Erreur INSERT historique:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Erreur route /api/historique:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
