import { createClient } from '@supabase/supabase-js';

export async function GET(): Promise<Response> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ licence_active: false })
      .lt('licence_expiry_date', new Date().toISOString())
      .eq('licence_active', true);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Licences expirées désactivées' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
