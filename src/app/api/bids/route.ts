import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { LEDGER_ACCOUNTS, recordLedgerEntry } from "@/lib/ledger";
import { getDriverAcceptFeeCents } from "@/lib/fees";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const loadId = (body.loadId ?? "").toString();
    const amountCents = Number(body.amountCents ?? 0);
    const instantAccept = Boolean(body.instantAccept ?? body.accept);
    if (!loadId || !Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "Missing loadId or amount" }, { status: 400 });
    }

    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

    if (instantAccept) {
      const now = new Date();
      const bid = await prisma.$transaction(async (tx) => {
        const driverFeeCents = Math.max(0, getDriverAcceptFeeCents());
        const existing = await tx.bid.findFirst({
          where: { loadId, driverId: user.id, status: "ACCEPTED" },
        });
        if (existing) return existing;

        const updated = await tx.load.updateMany({
          where: { id: loadId, assignmentStatus: { in: ["UNASSIGNED", "OFFERING"] } },
          data: { assignmentStatus: "ASSIGNED", assignedDriverId: user.id },
        });
        if (updated.count === 0) {
          throw new Error("Load already assigned");
        }

        const created = await tx.bid.create({
          data: {
            loadId,
            driverId: user.id,
            amountCents: Math.round(amountCents),
            status: "ACCEPTED",
            acceptedAt: now,
          },
        });

        await tx.bid.updateMany({
          where: { loadId, id: { not: created.id }, status: "PENDING" },
          data: { status: "DECLINED" },
        });
        await tx.payment.updateMany({
          where: { loadId },
          data: { payeeId: user.id },
        });
        await tx.driverStatus.updateMany({
          where: { driverId: user.id },
          data: { availability: "ON_TRIP" },
        });

        if (driverFeeCents > 0) {
          await recordLedgerEntry(tx, {
            refType: "PAYOUT",
            refId: created.id,
            debitAccount: LEDGER_ACCOUNTS.driverFeeWithheld,
            creditAccount: LEDGER_ACCOUNTS.sentkaRevenue,
            amountCents: driverFeeCents,
          });
        }

        return created;
      });
      return NextResponse.json(bid, { status: 201 });
    }

    const bid = await prisma.bid.create({
      data: {
        loadId,
        driverId: user.id,
        amountCents: Math.round(amountCents),
        status: "PENDING",
      },
    });

    return NextResponse.json(bid, { status: 201 });
  } catch (err: any) {
    if (err?.message === "Load already assigned") {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("POST /api/bids error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
