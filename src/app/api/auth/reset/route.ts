import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clearAuthCookies, createSession, hashPassword, withAuthCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body.token ?? "").toString().trim();
    const password = (body.password ?? "").toString();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const user = reset.user;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashPassword(password), lastLoginAt: new Date() },
      }),
      prisma.passwordReset.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }), // clear old sessions
    ]);

    const { token: sessionToken, expiresAt } = await createSession(
      user.id,
      req.headers.get("user-agent") ?? undefined,
      true
    );
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, username: user.username },
    });
    return withAuthCookies(res, sessionToken, user.role, expiresAt);
  } catch (err) {
    console.error("POST /api/auth/reset error", err);
    return clearAuthCookies(NextResponse.json({ error: "Server error" }, { status: 500 }));
  }
}
