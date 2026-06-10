import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — récupère issues + devices + hidden
export async function GET() {
  try {
    const [issuesRes, devicesRes] = await Promise.all([
      supabaseAdmin.from("custom_issues").select("id, label, hidden").order("created_at", { ascending: true }),
      supabaseAdmin.from("custom_devices").select("id, label").order("created_at", { ascending: true }),
    ]);

    return NextResponse.json({
      success: true,
      customIssues: (issuesRes.data ?? []).filter((i) => !i.hidden).map((i) => i.label),
      hiddenIssues: (issuesRes.data ?? []).filter((i) => i.hidden).map((i) => i.label),
      customDevices: (devicesRes.data ?? []).map((d) => d.label),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST — ajoute une panne ou un modèle
export async function POST(req: NextRequest) {
  try {
    const { type, label } = await req.json();
    if (!label?.trim()) return NextResponse.json({ success: false, error: "label vide" }, { status: 400 });

    if (type === "issue") {
      const { error } = await supabaseAdmin
        .from("custom_issues")
        .upsert({ label: label.trim(), hidden: false }, { onConflict: "label" });
      if (error) throw error;
    } else if (type === "device") {
      const { error } = await supabaseAdmin
        .from("custom_devices")
        .upsert({ label: label.trim() }, { onConflict: "label" });
      if (error) throw error;
    } else {
      return NextResponse.json({ success: false, error: "type invalide" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH — masquer/afficher une panne (hidden)
export async function PATCH(req: NextRequest) {
  try {
    const { label, hidden } = await req.json();
    const { error } = await supabaseAdmin
      .from("custom_issues")
      .update({ hidden })
      .eq("label", label);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE — supprime une panne ou un modèle
export async function DELETE(req: NextRequest) {
  try {
    const { type, label } = await req.json();
    if (type === "issue") {
      await supabaseAdmin.from("custom_issues").delete().eq("label", label);
    } else if (type === "device") {
      await supabaseAdmin.from("custom_devices").delete().eq("label", label);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
