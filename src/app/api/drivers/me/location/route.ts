import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ONLINE_INTERVAL_MS = 5_000;
const OFFLINE_INTERVAL_MS = 30_000;

function isValidLat(lat: number) {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLng(lng: number) {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function toNumberOrNull(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!isValidLat(lat) || !isValidLng(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const capturedAt = body.captured_at ? new Date(body.captured_at) : new Date();
    const effectiveCapturedAt = Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt;

    const status = await prisma.driverStatus.findUnique({ where: { driverId: user.id } });
    const location = await prisma.driverLocation.findUnique({ where: { driverId: user.id } });

    const availability = status?.availability ?? "OFFLINE";
    const minInterval = availability === "ONLINE" ? ONLINE_INTERVAL_MS : OFFLINE_INTERVAL_MS;
    if (location) {
      const elapsed = effectiveCapturedAt.getTime() - location.capturedAt.getTime();
      if (elapsed >= 0 && elapsed < minInterval) {
        return NextResponse.json(
          {
            error: "Rate limited",
            retryAfterMs: minInterval - elapsed,
          },
          { status: 429 }
        );
      }
    }

    const accuracyM = toNumberOrNull(body.accuracy_m);
    const headingDeg = toNumberOrNull(body.heading_deg);
    const speedMps = toNumberOrNull(body.speed_mps);

    await prisma.$transaction(async (tx) => {
      await tx.driverLocation.upsert({
        where: { driverId: user.id },
        update: {
          lat,
          lng,
          accuracyM,
          headingDeg,
          speedMps,
          capturedAt: effectiveCapturedAt,
        },
        create: {
          driverId: user.id,
          lat,
          lng,
          accuracyM,
          headingDeg,
          speedMps,
          capturedAt: effectiveCapturedAt,
        },
      });

      await tx.driverStatus.upsert({
        where: { driverId: user.id },
        update: { lastSeenAt: effectiveCapturedAt },
        create: {
          driverId: user.id,
          availability: availability as any,
          lastSeenAt: effectiveCapturedAt,
        },
      });
    });

    if (process.env.USE_POSTGIS === "true") {
      try {
        await prisma.$executeRaw`
          UPDATE "DriverLocation"
          SET "geom" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          WHERE "driverId" = ${user.id}
        `;
      } catch (err) {
        console.warn("PostGIS update failed", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/drivers/me/location error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
