import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStripe } from "@/lib/stripe";
import { currentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const loadId = (body.loadId ?? "").toString();
    const amountCents = Number(body.amountCents ?? 0);
    const currency = (body.currency ?? "usd").toLowerCase();
    const payeeId = (body.payeeId ?? "").toString() || null;
    const payeeConnectId = (body.payeeConnectId ?? "").toString() || null;
    const user = await currentUser(req);

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!loadId || !Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "Missing loadId or amountCents" }, { status: 400 });
    }

    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

    const stripe = requireStripe();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amountCents),
      currency,
      // Authorize now; capture later after ePOD approval to act like escrow.
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      metadata: { loadId, payeeId: payeeId || undefined },
      transfer_group: loadId,
    });

    await prisma.payment.create({
      data: {
        loadId,
        payerId: user.id,
        payeeId,
        payeeConnectId: payeeConnectId || null,
        amountCents: Math.round(amountCents),
        currency,
        paymentIntentId: intent.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    });
  } catch (err) {
    console.error("POST /api/payments/intent error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
