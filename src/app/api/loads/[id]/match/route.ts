import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { assignNearestDriver } from "@/lib/matching";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || (user.role !== "ADMIN" && user.role !== "SHIPPER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await assignNearestDriver(params.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/loads/[id]/match error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
