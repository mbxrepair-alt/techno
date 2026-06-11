import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/suivi",
  "/suivi-client",
  "/client",
  "/api/assistant-public",
  "/api/client-tracking",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("mbx_token")?.value;

  // Authenticated user hitting /login → send to dashboard
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Public route → allow through
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Protected route, no token → redirect to /login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
