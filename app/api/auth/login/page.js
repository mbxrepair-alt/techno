import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { email, access_code } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: user } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (!user || user.access_code !== access_code) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = crypto.randomUUID();

    await supabase.from("sessions").insert({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + 86400000),
    });

    cookies().set("mbx_token", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (e) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}