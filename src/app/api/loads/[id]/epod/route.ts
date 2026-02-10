import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { approveEarningForJob } from "@/lib/earnings";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || (user.role !== "SHIPPER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loadId = params.id;
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: {
        bids: { where: { status: "ACCEPTED" }, orderBy: { acceptedAt: "desc" } },
      },
    });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

    const updated = await prisma.load.update({
      where: { id: loadId },
      data: {
        ePODApprovedAt: new Date(),
        ePODApprovedById: user.id,
      },
    });

    const acceptedBid = load.bids?.[0];
    if (!acceptedBid) {
      return NextResponse.json({ error: "No accepted bid found for this load" }, { status: 400 });
    }

    await approveEarningForJob({
      jobId: load.id,
      driverId: acceptedBid.driverId,
      amountCents: acceptedBid.amountCents,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/loads/[id]/epod error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
