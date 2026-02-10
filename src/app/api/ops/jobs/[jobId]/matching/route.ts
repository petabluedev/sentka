import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await prisma.load.findUnique({
      where: { id: params.jobId },
      select: {
        id: true,
        pickupCity: true,
        dropoffCity: true,
        assignmentStatus: true,
        assignmentVersion: true,
        jobOffers: {
          orderBy: { offeredAt: "asc" },
          select: {
            id: true,
            driverId: true,
            offerStatus: true,
            offeredAt: true,
            respondedAt: true,
            expiresAt: true,
            attempt: true,
            score: true,
            distanceKm: true,
          },
        },
      },
    });

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    return NextResponse.json({
      jobId: job.id,
      assignmentStatus: job.assignmentStatus,
      assignmentVersion: job.assignmentVersion,
      lane: `${job.pickupCity} → ${job.dropoffCity}`,
      offers: job.jobOffers,
    });
  } catch (err) {
    console.error("GET /api/ops/jobs/[jobId]/matching error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
