import prisma from "@/lib/prisma";
import type { PrismaClient, Prisma } from "@prisma/client";

export type AssignmentAttemptResult =
  | { status: "not_found" }
  | { status: "already_assigned"; assignmentStatus: string }
  | { status: "offer_active"; offerId: string }
  | { status: "no_candidates" }
  | { status: "offered"; offerIds: string[]; attempt: number };

const SEARCH_RADII_KM = [5, 10, 25, 50];
const BROADCAST_LIMIT = 50;
const OFFER_TTL_SECONDS = 45;
const FRESHNESS_MS = 2 * 60 * 1000;
const DECLINE_WINDOW_MS = 24 * 60 * 60 * 1000;

type DbClient = Prisma.TransactionClient | PrismaClient;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function envEnabled(name: string, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

type Candidate = {
  driverId: string;
  distanceKm: number;
  score: number;
  stalenessSeconds: number;
  locationCapturedAt: Date;
};

function scoreCandidate(distanceKm: number, stalenessSeconds: number, declines: number) {
  return distanceKm * 1.0 + (stalenessSeconds / 60) * 0.5 + declines * 2.0;
}

function bboxForRadius(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos(toRadians(lat)) || 1);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

async function fetchCandidates(job: { pickupLat: number; pickupLng: number; vehicleType: string | null }, opts: {
  radiusKm?: number | null;
  excludeDriverIds: string[];
  now: Date;
  db: DbClient;
}) {
  const { radiusKm, excludeDriverIds, now } = opts;
  const cutoff = new Date(now.getTime() - FRESHNESS_MS);

  const db = opts.db;
  let locations: { driverId: string; lat: number; lng: number; capturedAt: Date }[] = [];

  const usePostgis = envEnabled("USE_POSTGIS");
  if (usePostgis && radiusKm != null) {
    try {
      const rows = await db.$queryRaw<
        { driverId: string; lat: number; lng: number; capturedAt: Date }[]
      >`
        SELECT "driverId", lat, lng, "capturedAt"
        FROM "DriverLocation"
        WHERE "geom" IS NOT NULL
          AND ST_DWithin(
            "geom",
            ST_SetSRID(ST_MakePoint(${job.pickupLng}, ${job.pickupLat}), 4326)::geography,
            ${radiusKm * 1000}
          )
      `;
      locations = rows;
    } catch (err) {
      console.warn("PostGIS query failed, falling back to Haversine", err);
    }
  }

  if (!locations.length) {
    const where = radiusKm
      ? {
          ...bboxForRadius(job.pickupLat, job.pickupLng, radiusKm),
        }
      : null;
    locations = await db.driverLocation.findMany({
      where: where
        ? {
            lat: { gte: where.minLat, lte: where.maxLat },
            lng: { gte: where.minLng, lte: where.maxLng },
          }
        : {},
      select: { driverId: true, lat: true, lng: true, capturedAt: true },
      take: radiusKm ? 500 : 2000,
    });
  }

  const driverIds = locations.map((l) => l.driverId).filter((id) => !excludeDriverIds.includes(id));
  if (!driverIds.length) return [] as Candidate[];

  const statuses = await db.driverStatus.findMany({
    where: {
      driverId: { in: driverIds },
      availability: "ONLINE",
      lastSeenAt: { gte: cutoff },
    },
    select: { driverId: true, vehicleType: true, lastSeenAt: true },
  });

  const statusMap = new Map(statuses.map((s) => [s.driverId, s]));
  const eligibleLocations = locations.filter((loc) => statusMap.has(loc.driverId));
  if (!eligibleLocations.length) return [] as Candidate[];

  const declineCutoff = new Date(now.getTime() - DECLINE_WINDOW_MS);
  const declineCounts = await db.jobOffer.groupBy({
    by: ["driverId"],
    where: {
      driverId: { in: eligibleLocations.map((l) => l.driverId) },
      offerStatus: { in: ["DECLINED", "EXPIRED"] },
      offeredAt: { gte: declineCutoff },
    },
    _count: { _all: true },
  });
  const declineMap = new Map(declineCounts.map((d) => [d.driverId, d._count._all]));

  const jobVehicle = (job.vehicleType ?? "").toString().toUpperCase();

  return eligibleLocations
    .filter((loc) => {
      const status = statusMap.get(loc.driverId);
      if (!status) return false;
      if (!jobVehicle) return true;
      if (!status.vehicleType) return true;
      return status.vehicleType === jobVehicle;
    })
    .map((loc) => {
      const stalenessSeconds = Math.max(0, (now.getTime() - loc.capturedAt.getTime()) / 1000);
      const distanceKm = haversineKm(job.pickupLat, job.pickupLng, loc.lat, loc.lng);
      const declines = declineMap.get(loc.driverId) ?? 0;
      return {
        driverId: loc.driverId,
        distanceKm,
        stalenessSeconds,
        locationCapturedAt: loc.capturedAt,
        score: scoreCandidate(distanceKm, stalenessSeconds, declines),
      };
    })
    .filter((c) => (radiusKm == null ? true : c.distanceKm <= radiusKm))
    .sort((a, b) => (a.score !== b.score ? a.score - b.score : a.driverId.localeCompare(b.driverId)));
}

export async function assignNearestDriver(jobId: string): Promise<AssignmentAttemptResult> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Load" WHERE id = ${jobId} FOR UPDATE`;
    const job = await tx.load.findUnique({ where: { id: jobId } });
    if (!job) return { status: "not_found" } as const;
    if (
      ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELED"].includes(job.assignmentStatus)
    ) {
      return { status: "already_assigned", assignmentStatus: job.assignmentStatus } as const;
    }
    if (job.pickupLat == null || job.pickupLng == null) {
      return { status: "no_candidates" } as const;
    }

    const activeOffer = await tx.jobOffer.findFirst({
      where: { jobId, offerStatus: "OFFERED", expiresAt: { gt: now } },
      select: { id: true },
    });
    if (activeOffer) {
      return { status: "offer_active", offerId: activeOffer.id } as const;
    }

    const previousOffers = await tx.jobOffer.findMany({
      where: { jobId },
      select: { driverId: true, attempt: true },
    });
    const maxAttempt = previousOffers.reduce((acc, o) => Math.max(acc, o.attempt), 0);

    for (let attempt = Math.max(1, maxAttempt || 1); attempt <= SEARCH_RADII_KM.length + 1; attempt++) {
      const offeredIds = previousOffers.filter((o) => o.attempt === attempt).map((o) => o.driverId);
      const radiusKm = attempt <= SEARCH_RADII_KM.length ? SEARCH_RADII_KM[attempt - 1] : null;
        const candidates = await fetchCandidates(
          { pickupLat: job.pickupLat, pickupLng: job.pickupLng, vehicleType: job.vehicleType },
        { radiusKm, excludeDriverIds: offeredIds, now, db: tx }
      );
      if (!candidates.length) continue;

      const expiresAt = new Date(now.getTime() + OFFER_TTL_SECONDS * 1000);
      const offerIds: string[] = [];

      if (attempt > SEARCH_RADII_KM.length) {
        const top = candidates.slice(0, BROADCAST_LIMIT);
        if (!top.length) continue;
        const rows = top.map((c) => ({
          id: undefined,
          jobId,
          driverId: c.driverId,
          offerStatus: "OFFERED" as const,
          expiresAt,
          score: c.score,
          distanceKm: c.distanceKm,
          attempt,
        }));
        await tx.jobOffer.createMany({
          data: rows.map((row) => ({
            jobId: row.jobId,
            driverId: row.driverId,
            offerStatus: row.offerStatus,
            expiresAt: row.expiresAt,
            score: row.score,
            distanceKm: row.distanceKm,
            attempt: row.attempt,
          })),
        });
        const created = await tx.jobOffer.findMany({
          where: { jobId, attempt, offerStatus: "OFFERED", expiresAt },
          select: { id: true },
        });
        offerIds.push(...created.map((o) => o.id));
      } else {
        const top = candidates[0];
        const created = await tx.jobOffer.create({
          data: {
            jobId,
            driverId: top.driverId,
            offerStatus: "OFFERED",
            expiresAt,
            score: top.score,
            distanceKm: top.distanceKm,
            attempt,
          },
        });
        offerIds.push(created.id);
      }

      await tx.load.update({
        where: { id: jobId },
        data: {
          assignmentStatus: "OFFERING",
          assignmentVersion: { increment: 1 },
        },
      });

      return { status: "offered", offerIds, attempt } as const;
    }

    return { status: "no_candidates" } as const;
  });
}

export async function acceptJobOffer(driverId: string, offerId: string) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const offer = await tx.jobOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new Error("Offer not found");
    if (offer.driverId !== driverId) throw new Error("Unauthorized");
    if (offer.offerStatus === "ACCEPTED") {
      const job = await tx.load.findUnique({ where: { id: offer.jobId } });
      if (!job) throw new Error("Job not found");
      return job;
    }
    if (offer.offerStatus !== "OFFERED" || offer.expiresAt <= now) {
      throw new Error("Offer expired");
    }

    await tx.$queryRaw`SELECT id FROM "Load" WHERE id = ${offer.jobId} FOR UPDATE`;
    const job = await tx.load.findUnique({ where: { id: offer.jobId } });
    if (!job) throw new Error("Job not found");
    if (job.assignmentStatus === "ASSIGNED") {
      if (job.assignedDriverId === driverId) return job;
      throw new Error("Job already assigned");
    }
    if (["IN_PROGRESS", "COMPLETED", "CANCELED"].includes(job.assignmentStatus)) {
      throw new Error("Job not assignable");
    }

    await tx.jobOffer.update({
      where: { id: offerId },
      data: { offerStatus: "ACCEPTED", respondedAt: now },
    });

    const updated = await tx.load.update({
      where: { id: job.id },
      data: {
        assignedDriverId: driverId,
        assignmentStatus: "ASSIGNED",
        assignmentVersion: { increment: 1 },
      },
    });

    await tx.driverStatus.upsert({
      where: { driverId },
      update: { availability: "ON_TRIP", lastSeenAt: now },
      create: { driverId, availability: "ON_TRIP", lastSeenAt: now },
    });

    return updated;
  });
}

export async function declineJobOffer(driverId: string, offerId: string) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const offer = await tx.jobOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new Error("Offer not found");
    if (offer.driverId !== driverId) throw new Error("Unauthorized");

    if (offer.offerStatus === "OFFERED") {
      await tx.jobOffer.update({
        where: { id: offerId },
        data: { offerStatus: "DECLINED", respondedAt: now },
      });
    }
    return offer.jobId;
  });
}

export async function expireOffersAndContinue() {
  const now = new Date();
  const expired = await prisma.jobOffer.findMany({
    where: { offerStatus: "OFFERED", expiresAt: { lt: now } },
    select: { id: true, jobId: true },
  });

  const jobIds = Array.from(new Set(expired.map((offer) => offer.jobId)));
  for (const offer of expired) {
    await prisma.jobOffer.update({
      where: { id: offer.id },
      data: { offerStatus: "EXPIRED", respondedAt: now },
    });
  }
  for (const jobId of jobIds) {
    await assignNearestDriver(jobId);
  }

  return { expired: expired.length, jobs: jobIds.length };
}
