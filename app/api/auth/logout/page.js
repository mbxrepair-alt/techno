import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  cookies().set("mbx_token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return NextResponse.json({ success: true });
}