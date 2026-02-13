import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { approveEarningForJob } from "@/lib/earnings";
import { requireStripe } from "@/lib/stripe";
import { getDriverAcceptFeeCents } from "@/lib/fees";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || (user.role !== "SHIPPER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loadId = params.id;
    const body = await req.json().catch(() => ({}));
    const signatureInput = (body.signature ?? "").toString().trim();
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: {
        bids: { where: { status: "ACCEPTED" }, orderBy: { acceptedAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

    const acceptedBid = load.bids?.[0];
    if (!acceptedBid) {
      return NextResponse.json({ error: "No accepted bid found for this load" }, { status: 400 });
    }

    const alreadyApproved = Boolean(load.ePODApprovedAt);
    const signature = signatureInput || load.ePODSignature || user.name || user.email || "Shipper";
    if (!alreadyApproved) {
      await prisma.load.update({
        where: { id: loadId },
        data: {
          ePODApprovedAt: new Date(),
          ePODApprovedById: user.id,
          ePODSignature: signature,
        },
      });
    }

    const driverFeeCents = Math.max(0, getDriverAcceptFeeCents());
    const driverNetCents = Math.max(0, acceptedBid.amountCents - driverFeeCents);
    const platformFeeCents = Math.max(0, (load.priceCents ?? 0) - acceptedBid.amountCents);
    await approveEarningForJob({
      jobId: load.id,
      driverId: acceptedBid.driverId,
      amountCents: driverNetCents,
      platformFeeCents,
    });

    const payment = load.payments?.find((p) => !p.captured) ?? load.payments?.[0] ?? null;
    let captureError: string | null = null;
    if (payment && !payment.captured && payment.paymentIntentId) {
      try {
        const stripe = requireStripe();
        await stripe.paymentIntents.capture(payment.paymentIntentId);

        let transferId: string | null = null;
        if (payment.payeeConnectId) {
          const transfer = await stripe.transfers.create({
            amount: payment.amountCents,
            currency: payment.currency,
            destination: payment.payeeConnectId,
            transfer_group: payment.loadId,
            metadata: { loadId: payment.loadId, paymentId: payment.id },
          });
          transferId = transfer.id;
        }

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED", captured: true, releasedAt: new Date(), transferId },
        });
      } catch (err: any) {
        console.error("Auto-capture after ePOD failed", err);
        captureError = err?.message ?? "Capture failed";
      }
    }

    return NextResponse.json({ ok: true, captureError });
  } catch (err) {
    console.error("POST /api/loads/[id]/epod error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
