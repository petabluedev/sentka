import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, deleteSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    await deleteSession(token);
    return clearAuthCookies(NextResponse.json({ ok: true }));
  } catch (err) {
    console.error("POST /api/auth/logout error", err);
    return clearAuthCookies(NextResponse.json({ error: "Server error" }, { status: 500 }));
  }
}
