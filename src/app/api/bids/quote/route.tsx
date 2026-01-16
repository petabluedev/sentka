// src/app/api/bids/quote/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // TODO: persist to DB, trigger driver notifications, etc.
  return NextResponse.json({ ok: true, received: body }, { status: 200 });
}
