import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const loadId = params.id;
    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

    const updated = await prisma.load.update({
      where: { id: loadId },
      data: {
        ePODApprovedAt: new Date(),
        ePODApprovedById: user.id,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/loads/[id]/epod error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
