// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "sentka_session";
const ROLE_COOKIE = "sentka_role";

type Guard = { prefix: string; roles: string[] };
const guards: Guard[] = [
  { prefix: "/shipper", roles: ["SHIPPER", "ADMIN"] },
  { prefix: "/driver", roles: ["DRIVER", "ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

export const config = {
  matcher: ["/shipper/:path*", "/driver/:path*", "/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const guard = guards.find((g) => pathname.startsWith(g.prefix));
  if (!guard) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const role = (req.cookies.get(ROLE_COOKIE)?.value ?? "").toUpperCase();

  if (!token || !role) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  if (!guard.roles.includes(role)) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  return NextResponse.next();
}
