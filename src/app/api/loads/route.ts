import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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
