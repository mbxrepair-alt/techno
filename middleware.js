import { NextResponse } from "next/server";

export function middleware(request) {
  // Vérifier si l'utilisateur est authentifié via sessionStorage
  // Note: Le middleware ne peut pas accéder directement à sessionStorage
  // On utilise un token dans les cookies ou un header
  
  const url = request.nextUrl.pathname;
  
  // Pages publiques (sans authentification)
  const publicPages = ["/login", "/register", "/reset-password"];
  
  if (publicPages.includes(url)) {
    return NextResponse.next();
  }
  
  // Vérifier la présence du token dans les cookies
  const authToken = request.cookies.get("mbx_auth_token")?.value;
  
  if (!authToken) {
    // Rediriger vers login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
