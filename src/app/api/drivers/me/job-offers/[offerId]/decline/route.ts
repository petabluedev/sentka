import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { declineJobOffer, assignNearestDriver } from "@/lib/matching";

export async function POST(req: NextRequest, { params }: { params: { offerId: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = await declineJobOffer(user.id, params.offerId);
    assignNearestDriver(jobId).catch((err) => {
      console.error("Matching continuation error", err);
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const message = err?.message || "Server error";
    const status = message.includes("Offer") ? 400 : 500;
    console.error("POST /api/drivers/me/job-offers/[offerId]/decline error", err);
    return NextResponse.json({ error: message }, { status });
  }
}
