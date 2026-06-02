import { NextResponse } from "next/server";

export function middleware(req) {
  const auth = req.cookies.get("sb-access-token");

  const isAuthPage = req.nextUrl.pathname === "/login";

  // si pas connecté → redirect login
  if (!auth && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
