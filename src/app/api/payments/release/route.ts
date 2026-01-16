import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStripe } from "@/lib/stripe";
import { currentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentId = (body.paymentId ?? "").toString();
    if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

    const user = await currentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { load: true },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (!payment.paymentIntentId) return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
    if (payment.captured) return NextResponse.json({ ok: true });
    if (!payment.load?.ePODApprovedAt) {
      return NextResponse.json({ error: "ePOD not approved" }, { status: 400 });
    }

    const stripe = requireStripe();
    // Capture the authorized payment after ePOD approval.
    const capturedIntent = await stripe.paymentIntents.capture(payment.paymentIntentId);

    let transferId: string | null = null;
    if (payment.payeeConnectId) {
      try {
        const transfer = await stripe.transfers.create({
          amount: payment.amountCents,
          currency: payment.currency,
          destination: payment.payeeConnectId,
          transfer_group: payment.loadId,
          metadata: { loadId: payment.loadId, paymentId: payment.id },
        });
        transferId = transfer.id;
      } catch (err) {
        console.error("Transfer to payee failed", err);
        // Still captured; surface transfer issue to client.
        return NextResponse.json({ error: "Captured, but transfer failed" }, { status: 500 });
      }
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "SUCCEEDED", captured: true, releasedAt: new Date(), transferId },
    });

    return NextResponse.json({ ok: true, paymentIntentId: capturedIntent.id, transferId });
  } catch (err) {
    console.error("POST /api/payments/release error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
