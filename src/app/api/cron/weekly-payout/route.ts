import { NextRequest, NextResponse } from "next/server";
import { runWeeklyPayouts } from "@/lib/payouts";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await runWeeklyPayouts();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("POST /api/cron/weekly-payout error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
