import { NextResponse } from "next/server";

export async function POST(req) {
  const { token } = await req.json();
  
  const response = NextResponse.json({ success: true });
  
  // Cookie sécurisé
  response.cookies.set("token", token, {
    httpOnly: true,           // Inaccessible via JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",       // Protège contre les attaques CSRF
    maxAge: 60 * 60 * 24,     // 24 heures
    path: "/",
  });
  
  return response;
}