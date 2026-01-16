import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentId = (body.paymentId ?? "").toString();
    if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (!payment.paymentIntentId) return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });

    const stripe = requireStripe();
    await stripe.refunds.create({ payment_intent: payment.paymentIntentId });

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED", refundedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/payments/refund error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
