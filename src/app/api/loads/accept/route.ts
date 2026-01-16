import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const loadId = (body.loadId ?? "").toString();
    if (!loadId) return NextResponse.json({ error: "Missing loadId" }, { status: 400 });

    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

    const payment = await prisma.payment.findFirst({
      where: { loadId },
      orderBy: { createdAt: "desc" },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          payeeId: user.id,
          status: "SUCCEEDED",
          captured: true,
          releasedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/loads/accept error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
