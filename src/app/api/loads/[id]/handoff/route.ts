import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || (user.role !== "SHIPPER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const signatureInput = (body.signature ?? "").toString().trim();
    const loadId = params.id;

    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: { bids: { where: { status: "ACCEPTED" }, orderBy: { acceptedAt: "desc" } } },
    });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });
    if (!load.bids?.length) {
      return NextResponse.json({ error: "No accepted bid found for this load" }, { status: 400 });
    }

    if (load.pickupHandoffAt) {
      return NextResponse.json({ ok: true });
    }

    const signature = signatureInput || user.name || user.email || "Shipper";
    await prisma.load.update({
      where: { id: loadId },
      data: {
        pickupHandoffAt: new Date(),
        pickupHandoffById: user.id,
        pickupHandoffSignature: signature,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/loads/[id]/handoff error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
