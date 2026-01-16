import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

const RESET_TTL_MS = 1000 * 60 * 15; // 15 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email ?? "").toString().trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Do not reveal user existence; return success
      return NextResponse.json({ ok: true });
    }

    // Invalidate old tokens
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);
    await prisma.passwordReset.create({
      data: { token, userId: user.id, expiresAt },
    });

    // In a real app, email the link. For now, return token for manual testing.
    return NextResponse.json({ ok: true, token, expiresAt });
  } catch (err) {
    console.error("POST /api/auth/forgot error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
