import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RepairInsert {
  client_id: string | number;
  device: string;
  issue: string;
  imei?: string;
  unlock_code?: string;
  unlock_pattern?: string;
  description?: string;
  estimated_price?: number;
  final_price?: number;
  status?: string;
  user_id: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'user_id requis' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RepairInsert = await request.json();

    if (!body.client_id || !body.device || !body.issue || !body.user_id) {
      return NextResponse.json(
        { success: false, error: 'client_id, device, issue et user_id sont requis' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('repairs')
      .insert([{
        client_id: body.client_id,
        device: body.device,
        issue: body.issue,
        imei: body.imei ?? 'NC',
        unlock_code: body.unlock_code ?? 'NC',
        unlock_pattern: body.unlock_pattern ?? '',
        description: body.description ?? 'NC',
        estimated_price: body.estimated_price ?? 0,
        final_price: body.final_price ?? 0,
        status: body.status ?? '🟡 Réceptionné',
        user_id: body.user_id,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
