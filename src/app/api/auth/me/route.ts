import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error("GET /api/auth/me error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
