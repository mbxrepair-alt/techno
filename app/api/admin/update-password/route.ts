import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface UpdatePasswordBody {
  id: string;
  new_password: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { id, new_password } = (await request.json()) as UpdatePasswordBody;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase
    .from("profiles")
    .update({ employee_password: new_password })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
