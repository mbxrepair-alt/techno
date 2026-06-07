import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ success: false, error: "Paramètres manquants" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Format non accepté. Utilisez PNG, JPEG ou WEBP" },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Le fichier ne doit pas dépasser 2MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/logo-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, { contentType: file.type, cacheControl: '3600', upsert: true });

    if (error) {
      console.error("Erreur upload:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ logo_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error("Erreur mise à jour:", updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Erreur générale:", error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
