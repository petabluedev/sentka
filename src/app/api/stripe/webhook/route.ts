import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe, requireStripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const s = requireStripe();
    event = s.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error("Webhook signature verification failed", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.amount_capturable_updated":
        await handleIntent(event.data.object as Stripe.PaymentIntent, "REQUIRES_ACTION");
        break;
      case "payment_intent.canceled":
        await handleIntent(event.data.object as Stripe.PaymentIntent, "CANCELED");
        break;
      case "payment_intent.succeeded":
        await handleIntent(event.data.object as Stripe.PaymentIntent, "SUCCEEDED");
        break;
      case "payment_intent.payment_failed":
        await handleIntent(event.data.object as Stripe.PaymentIntent, "FAILED");
        break;
      case "charge.refunded":
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function handleIntent(
  intent: Stripe.PaymentIntent,
  status: "SUCCEEDED" | "FAILED" | "REQUIRES_ACTION" | "CANCELED"
) {
  if (!intent.metadata?.loadId) return;
  const captured = status === "SUCCEEDED" ? intent.status === "succeeded" : undefined;
  await prisma.payment.updateMany({
    where: { paymentIntentId: intent.id },
    data: {
      status,
      captured: captured ?? undefined,
    },
  });
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;
  await prisma.payment.updateMany({
    where: { paymentIntentId: charge.payment_intent.toString() },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });
}
