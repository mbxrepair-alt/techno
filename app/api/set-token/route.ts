import { NextRequest, NextResponse } from "next/server";

interface SetTokenBody {
  token: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { token } = await request.json() as SetTokenBody;

  const response = NextResponse.json({ success: true });

  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return response;
}
