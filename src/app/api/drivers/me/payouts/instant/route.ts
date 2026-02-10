import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createInstantPayoutForDriver, getInstantFeeCents } from "@/lib/payouts";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idempotencyKey =
      req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Missing idempotency key" }, { status: 400 });
    }

    const result = await createInstantPayoutForDriver(user.id, { idempotencyKey });
    if (!result) {
      return NextResponse.json({ error: "No approved earnings available" }, { status: 400 });
    }

    const feeCents = result.feeCents ?? getInstantFeeCents();
    const railUsed = result.railUsed ?? result.payout.railUsed;
    const isInstant =
      result.payout.status === "SUCCEEDED" &&
      (railUsed === "FEDNOW" || railUsed === "RTP" || railUsed === "INSTANT_DEBIT");
    const destinationType = railUsed === "INSTANT_DEBIT" ? "Debit" : "Bank";
    const destinationMask = result.destinationMask ?? result.payout.destinationMask ?? "—";
    return NextResponse.json({
      ok: true,
      payoutId: result.payout.id,
      method: result.payout.method,
      railUsed,
      status: result.payout.status,
      amountGrossCents: result.payout.amountGrossCents,
      feeAmountCents: feeCents,
      amountNetCents: result.payout.amountNetCents,
      destination: `${destinationType} ••••${destinationMask}`,
      message: isInstant
        ? `Deposited to ${destinationType} ••••${destinationMask} (Instant)`
        : `Scheduled to Bank ••••${destinationMask}`,
    });
  } catch (err: any) {
    console.error("POST /api/drivers/me/payouts/instant error", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
