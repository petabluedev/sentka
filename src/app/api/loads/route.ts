import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assignNearestDriver } from "@/lib/matching";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

function normalizePayload(input: any) {
  // Accept either: { from, to, price }  OR  { pickupCity, dropoffCity, priceCents/price }
  const pickupCity = input.pickupCity ?? input.from;
  const dropoffCity = input.dropoffCity ?? input.to;
  const vehicle = input.vehicle ?? "";
  const vehicleType =
    (input.vehicleType ?? "").toString().toUpperCase() || "SEDAN";
  const enclosed = Boolean(input.enclosed ?? false);
  const operable =
    input.operable === undefined ? true : Boolean(input.operable);

  // price can be "price" (USD) or "priceCents"
  let priceCents: number | null = null;
  if (input.priceCents != null && input.priceCents !== "") {
    const pc = Number(input.priceCents);
    if (Number.isFinite(pc)) priceCents = Math.round(pc);
  } else if (input.price != null && input.price !== "") {
    const p = Number(input.price);
    if (Number.isFinite(p)) priceCents = Math.round(p * 100);
  }

  const distance = input.distance != null ? Number(input.distance) : null;
  const pickupDate = input.date ? new Date(input.date) : null;
  const pickupLat = input.pickupLat != null ? Number(input.pickupLat) : null;
  const pickupLng = input.pickupLng != null ? Number(input.pickupLng) : null;
  const dropoffLat = input.dropoffLat != null ? Number(input.dropoffLat) : null;
  const dropoffLng = input.dropoffLng != null ? Number(input.dropoffLng) : null;

  return {
    pickupCity,
    dropoffCity,
    vehicle,
    vehicleType,
    enclosed,
    operable,
    priceCents,
    distance: Number.isFinite(distance as number)
      ? (distance as number)
      : null,
    pickupDate,
    pickupLat: Number.isFinite(pickupLat as number) ? (pickupLat as number) : null,
    pickupLng: Number.isFinite(pickupLng as number) ? (pickupLng as number) : null,
    dropoffLat: Number.isFinite(dropoffLat as number) ? (dropoffLat as number) : null,
    dropoffLng: Number.isFinite(dropoffLng as number) ? (dropoffLng as number) : null,
  };
}

async function readBody(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await req.json();
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const fd = await req.formData();
    const obj: Record<string, any> = {};
    fd.forEach((v, k) => (obj[k] = v));
    return obj;
  }
  // default try json
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await readBody(req);
    const data = normalizePayload(raw);
    const user = await currentUser(req);

    const missing: string[] = [];
    if (!data.pickupCity) missing.push("pickupCity");
    if (!data.dropoffCity) missing.push("dropoffCity");
    if (data.priceCents == null) missing.push("price or priceCents");

    if (missing.length) {
      return NextResponse.json(
        { error: `Missing: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (user?.id) {
      const recent = await prisma.load.findFirst({
        where: {
          postedById: user.id,
          pickupCity: data.pickupCity!,
          dropoffCity: data.dropoffCity!,
          priceCents: data.priceCents!,
          vehicleType: data.vehicleType,
          vehicle: data.vehicle,
          enclosed: data.enclosed,
          operable: data.operable,
          createdAt: { gte: new Date(Date.now() - 30_000) },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recent) {
        return NextResponse.json(recent, { status: 200 });
      }
    }

    // At this point we KNOW pickupCity, dropoffCity, priceCents exist
    const created = await prisma.load.create({
      data: {
        ...data,
        pickupCity: data.pickupCity!, // we validated above
        dropoffCity: data.dropoffCity!, // we validated above
        priceCents: data.priceCents!, // we validated above
        postedById: user?.id,
      },
    });

    if (created.pickupLat != null && created.pickupLng != null) {
      assignNearestDriver(created.id).catch((err) => {
        console.error("Matching error for load", created.id, err);
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/loads error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const loads = await prisma.load.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
      },
      bids: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return NextResponse.json(loads);
}
