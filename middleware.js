import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl.pathname;

  // 📌 PAGES PUBLIQUES (accessibles sans authentification)
  const publicPages = ["/", "/login", "/register", "/reset-password"];

  // ✅ Si c'est une page publique, on laisse passer
  if (publicPages.includes(url)) {
    return NextResponse.next();
  }

  // 🔒 Pour les autres pages, vérifier le cookie d'authentification
  const authToken = request.cookies.get("mbx_auth_token")?.value;

  if (!authToken) {
    // Rediriger vers login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
