import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  clearAuthCookies,
  createSession,
  verifyPassword,
  withAuthCookies,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const login = (body.email ?? body.username ?? body.login ?? "").toString().trim();
    const password = (body.password ?? "").toString();
    const remember = Boolean(body.remember);

    if (!login || !password) {
      return NextResponse.json({ error: "Missing email/username or password" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: login.toLowerCase(), mode: "insensitive" } },
          { username: { equals: login.toLowerCase(), mode: "insensitive" } },
        ],
      },
    });
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { token, expiresAt } = await createSession(
      user.id,
      req.headers.get("user-agent") ?? undefined,
      remember
    );
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, username: user.username },
    });
    return withAuthCookies(res, token, user.role, expiresAt);
  } catch (err) {
    console.error("POST /api/auth/login error", err);
    return clearAuthCookies(NextResponse.json({ error: "Server error" }, { status: 500 }));
  }
}
