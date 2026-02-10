import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { acceptJobOffer } from "@/lib/matching";

export async function POST(req: NextRequest, { params }: { params: { offerId: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await acceptJobOffer(user.id, params.offerId);
    return NextResponse.json({ ok: true, job });
  } catch (err: any) {
    const message = err?.message || "Server error";
    const status = message.includes("Offer") || message.includes("Job") ? 400 : 500;
    console.error("POST /api/drivers/me/job-offers/[offerId]/accept error", err);
    return NextResponse.json({ error: message }, { status });
  }
}
