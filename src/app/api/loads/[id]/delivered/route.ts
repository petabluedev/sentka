import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const load = await prisma.load.findUnique({
      where: { id: params.id },
      include: { bids: { where: { status: "ACCEPTED" }, orderBy: { acceptedAt: "desc" } } },
    });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

    const acceptedBid = load.bids?.[0];
    const isAssigned = load.assignedDriverId === user.id || acceptedBid?.driverId === user.id;
    if (!isAssigned) {
      return NextResponse.json({ error: "Not assigned to this load" }, { status: 403 });
    }

    if (load.ePODRequestedAt) {
      return NextResponse.json({ ok: true });
    }

    await prisma.load.update({
      where: { id: load.id },
      data: {
        ePODRequestedAt: new Date(),
        ePODRequestedById: user.id,
        assignmentStatus: "COMPLETED",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/loads/[id]/delivered error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
