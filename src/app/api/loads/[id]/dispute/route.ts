import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { openDisputeForJob } from "@/lib/earnings";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || (user.role !== "SHIPPER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const jobId = params.id;
    const earning = await openDisputeForJob(jobId);
    if (!earning) return NextResponse.json({ error: "Earning not found" }, { status: 404 });
    return NextResponse.json({ ok: true, earning });
  } catch (err) {
    console.error("POST /api/loads/[id]/dispute error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
