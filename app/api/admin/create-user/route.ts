import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    if (!serviceKey) {
      return NextResponse.json({ error: "Clé service non configurée sur le serveur" }, { status: 500 });
    }

    const { email, password, name, phone, shop_name, access_code } = await req.json();
    const code = /^\d{4}$/.test(String(access_code || "")) ? String(access_code) : "1234";

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Mot de passe : 6 caractères minimum" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1. Créer le compte Auth (confirmé d'emblée → connexion immédiate possible)
    const { data: created, error: authErr } = await supabase.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: { name, phone, shop_name },
    });

    if (authErr || !created?.user) {
      return NextResponse.json({ error: authErr?.message || "Échec de création du compte" }, { status: 400 });
    }

    const userId = created.user.id;

    // 2. Profil
    await supabase.from("profiles").upsert(
      {
        id: userId,
        email: String(email).trim(),
        name: name || null,
        phone: phone || null,
        shop_name: shop_name || null,
        is_admin: false,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    // 3. Technicien gérant par défaut (sinon impossible de passer l'étape "code" au login)
    await supabase.from("technicians").insert([
      {
        name: name || "Gérant",
        access_code: code,
        is_active: true,
        is_gerant: true,
        can_access_repairs: true,
        can_access_clients: true,
        can_access_factures: true,
        can_access_paiements: true,
        can_access_statistiques: true,
        can_access_settings: true,
        company_id: userId,
      },
    ]);

    return NextResponse.json({ success: true, userId, access_code: code });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
