import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const allowed = new Set(["ONLINE", "OFFLINE", "PAUSED"]);

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const availability = (body.availability ?? "").toString().toUpperCase();
    if (!allowed.has(availability)) {
      return NextResponse.json({ error: "Invalid availability" }, { status: 400 });
    }

    const updated = await prisma.driverStatus.upsert({
      where: { driverId: user.id },
      update: { availability },
      create: { driverId: user.id, availability },
    });

    return NextResponse.json({ ok: true, availability: updated.availability });
  } catch (err) {
    console.error("POST /api/drivers/me/availability error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
