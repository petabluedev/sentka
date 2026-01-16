import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const loadId = (body.loadId ?? "").toString();
    const amountCents = Number(body.amountCents ?? 0);
    if (!loadId || !Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "Missing loadId or amount" }, { status: 400 });
    }

    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

    const bid = await prisma.bid.create({
      data: {
        loadId,
        driverId: user.id,
        amountCents: Math.round(amountCents),
        status: "PENDING",
      },
    });

    return NextResponse.json(bid, { status: 201 });
  } catch (err) {
    console.error("POST /api/bids error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
