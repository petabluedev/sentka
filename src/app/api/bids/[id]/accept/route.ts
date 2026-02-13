import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { LEDGER_ACCOUNTS, recordLedgerEntry } from "@/lib/ledger";
import { getDriverAcceptFeeCents } from "@/lib/fees";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "SHIPPER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bidId = params.id;
    const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { load: true } });
    if (!bid) return NextResponse.json({ error: "Bid not found" }, { status: 404 });

    // Accept this bid, decline others on the same load.
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const updated = await tx.bid.update({
        where: { id: bidId },
        data: { status: "ACCEPTED", acceptedAt: now },
      });
      await tx.bid.updateMany({
        where: { loadId: bid.loadId, id: { not: bidId }, status: "PENDING" },
        data: { status: "DECLINED" },
      });
      await tx.load.update({
        where: { id: bid.loadId },
        data: { assignmentStatus: "ASSIGNED", assignedDriverId: bid.driverId },
      });
      await tx.driverStatus.updateMany({
        where: { driverId: bid.driverId },
        data: { availability: "ON_TRIP" },
      });

      const driverFeeCents = Math.max(0, getDriverAcceptFeeCents());
      if (driverFeeCents > 0) {
        await recordLedgerEntry(tx, {
          refType: "PAYOUT",
          refId: updated.id,
          debitAccount: LEDGER_ACCOUNTS.driverFeeWithheld,
          creditAccount: LEDGER_ACCOUNTS.sentkaRevenue,
          amountCents: driverFeeCents,
        });
      }
    });

    // Optionally set payeeId on the payment if exists.
    await prisma.payment.updateMany({
      where: { loadId: bid.loadId },
      data: { payeeId: bid.driverId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/bids/[id]/accept error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
