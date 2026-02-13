import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStripe } from "@/lib/stripe";
import { currentUser } from "@/lib/auth";
import { LEDGER_ACCOUNTS, recordLedgerEntry } from "@/lib/ledger";
import { getShipperFeeCents } from "@/lib/fees";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const loadId = (body.loadId ?? "").toString();
    const baseAmountCents = Number(body.amountCents ?? 0);
    const currency = (body.currency ?? "usd").toLowerCase();
    const payeeId = (body.payeeId ?? "").toString() || null;
    const payeeConnectId = (body.payeeConnectId ?? "").toString() || null;
    const user = await currentUser(req);

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!loadId || !Number.isFinite(baseAmountCents) || baseAmountCents <= 0) {
      return NextResponse.json({ error: "Missing loadId or amountCents" }, { status: 400 });
    }

    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

    const stripe = requireStripe();
    const shipperFeeCents = Math.max(0, getShipperFeeCents());
    const baseAmountRounded = Math.round(baseAmountCents);
    const totalAmountCents = baseAmountRounded + shipperFeeCents;

    const existing = await prisma.payment.findFirst({
      where: { loadId, captured: false },
      orderBy: { createdAt: "desc" },
    });
    if (existing?.paymentIntentId) {
      try {
        const intentExisting = await stripe.paymentIntents.retrieve(existing.paymentIntentId);
        if (intentExisting?.client_secret) {
          return NextResponse.json({
            clientSecret: intentExisting.client_secret,
            paymentIntentId: intentExisting.id,
            reused: true,
            shipperFeeCents: getShipperFeeCents(),
          });
        }
      } catch (err) {
        console.error("Retrieve existing payment intent failed", err);
      }
    }
    const intent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency,
      // Authorize now; capture later after ePOD approval to act like escrow.
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      metadata: { loadId, payeeId: payeeId || undefined, baseAmountCents: baseAmountRounded, shipperFeeCents },
      transfer_group: loadId,
    });

    const payment = await prisma.payment.create({
      data: {
        loadId,
        payerId: user.id,
        payeeId,
        payeeConnectId: payeeConnectId || null,
        amountCents: totalAmountCents,
        currency,
        paymentIntentId: intent.id,
        status: "PENDING",
        notes: `base:${baseAmountRounded} fee:${shipperFeeCents}`,
      },
    });

    if (shipperFeeCents > 0) {
      await recordLedgerEntry(prisma, {
        refType: "PAYOUT",
        refId: payment.id,
        debitAccount: LEDGER_ACCOUNTS.escrowCash,
        creditAccount: LEDGER_ACCOUNTS.sentkaRevenue,
        amountCents: shipperFeeCents,
      });
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      shipperFeeCents,
      totalAmountCents,
    });
  } catch (err) {
    console.error("POST /api/payments/intent error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
