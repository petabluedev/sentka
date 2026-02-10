import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payouts = await prisma.payout.findMany({
      where: { driverId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        id: p.id,
        amountGrossCents: p.amountGrossCents,
        feeAmountCents: p.feeAmountCents,
        amountNetCents: p.amountNetCents,
        method: p.method,
        railUsed: p.railUsed,
        status: p.status,
        destinationMask: p.destinationMask,
        providerReferenceId: p.providerReferenceId,
        createdAt: p.createdAt.toISOString(),
        initiatedAt: p.initiatedAt?.toISOString() ?? null,
        processedAt: p.processedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    console.error("GET /api/drivers/me/payouts error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
