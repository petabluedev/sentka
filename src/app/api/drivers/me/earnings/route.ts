import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const earnings = await prisma.earning.findMany({
      where: { driverId: user.id },
      include: {
        job: { select: { pickupCity: true, dropoffCity: true } },
        payout: { select: { method: true, destinationMask: true, status: true, railUsed: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const summary = earnings.reduce(
      (acc, e) => {
        if (e.status === "PENDING") acc.pendingCents += e.amountCents;
        if (e.status === "APPROVED") acc.approvedCents += e.amountCents;
        if (e.status === "PAID") acc.paidCents += e.amountCents;
        return acc;
      },
      { pendingCents: 0, approvedCents: 0, paidCents: 0 }
    );

    return NextResponse.json({
      summary,
      earnings: earnings.map((e) => ({
        id: e.id,
        jobId: e.jobId,
        amountCents: e.amountCents,
        status: e.status,
        approvedAt: e.approvedAt?.toISOString() ?? null,
        paidAt: e.paidAt?.toISOString() ?? null,
        lane: `${e.job.pickupCity} → ${e.job.dropoffCity}`,
        payout: e.payout
          ? {
              method: e.payout.method,
              destinationMask: e.payout.destinationMask,
              status: e.payout.status,
              railUsed: e.payout.railUsed,
            }
          : null,
      })),
    });
  } catch (err) {
    console.error("GET /api/drivers/me/earnings error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
