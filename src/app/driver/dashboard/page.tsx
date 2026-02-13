// src/app/driver/dashboard/page.tsx
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import type { Initial } from "@/app/driver/dashboard/DriverDashboardClient";
import AuthStatus from "@/components/auth/AuthStatus";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getInstantFeeCents } from "@/lib/payouts";
import { haversineKm } from "@/lib/matching";

const DriverDashboardClient = dynamic(() => import("@/app/driver/dashboard/DriverDashboardClient"), {
  ssr: false,
});

export const metadata = { title: "Driver Dashboard • Sentka" };

type Load = {
  id: string;
  pickupCity: string;
  dropoffCity: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupHandoffAt?: string | null;
  priceCents: number;
  enclosed?: boolean;
  operable?: boolean;
  vehicleType?: string;
  distance?: number | null;
  createdAt?: string;
  ePODApprovedAt?: string | null;
  ePODRequestedAt?: string | null;
  payments?: { captured: boolean; releasedAt?: string | null }[];
  bids?: { id: string; driverId: string; status: string; amountCents: number; createdAt: string }[];
};

type EarningItem = {
  id: string;
  jobId: string;
  amountCents: number;
  status: "PENDING" | "APPROVED" | "PAID";
  approvedAt?: string | null;
  paidAt?: string | null;
  lane: string;
  payout?: {
    method: "WEEKLY_ACH" | "INSTANT_DEBIT";
    destinationMask?: string | null;
    status?: "CREATED" | "PROCESSING" | "SUCCEEDED" | "FAILED";
    railUsed?: "FEDNOW" | "RTP" | "INSTANT_DEBIT" | "ACH_SAME_DAY" | "ACH_STANDARD" | null;
  } | null;
};

export default async function DriverDashboardPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  const initialUser = session?.user
    ? { email: session.user.email, username: (session.user as any).username ?? "", role: session.user.role }
    : null;

  const driverId = session?.user?.id ?? null;

  const [availableLoadsRaw, myLoadsRaw, earningsRaw, driverLocation] = await Promise.all([
    prisma.load.findMany({
      where: {
        bids: { none: { status: { equals: "ACCEPTED" } } },
        ...(driverId
          ? {
              NOT: {
                bids: { some: { driverId: { equals: driverId } } },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        pickupCity: true,
        dropoffCity: true,
        pickupLat: true,
        pickupLng: true,
        priceCents: true,
        vehicleType: true,
        distance: true,
        bids: {
          select: { id: true, driverId: true, status: true, amountCents: true, createdAt: true },
        },
      },
    }),
    driverId
      ? prisma.load.findMany({
          where: {
            OR: [
              { bids: { some: { driverId, status: "ACCEPTED" } } },
              { payments: { some: { payeeId: driverId } } },
            ],
          },
          orderBy: { createdAt: "desc" },
          include: {
            bids: true,
            payments: true,
          },
        })
      : [],
    driverId
      ? prisma.earning.findMany({
          where: { driverId },
          include: { job: { select: { pickupCity: true, dropoffCity: true } }, payout: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [],
    driverId ? prisma.driverLocation.findUnique({ where: { driverId } }) : null,
  ]);

  const myLoadsMapped =
    myLoadsRaw?.map((l) => {
      const acceptedBid = l.bids?.find((b) => b.status === "ACCEPTED");
      const completed = Boolean(l.ePODApprovedAt || l.payments?.some((p) => p.captured));
      const deliveredRequested = Boolean(l.ePODRequestedAt);
      const pickupSigned = Boolean(l.pickupHandoffAt);
      const status = completed
        ? ("DELIVERED" as const)
        : deliveredRequested
        ? ("DELIVERED" as const)
        : pickupSigned
        ? ("PICKED" as const)
        : ("EN-ROUTE" as const);
      const handoffNote = completed
        ? "ePOD signed"
        : deliveredRequested
        ? "Awaiting shipper ePOD"
        : pickupSigned
        ? "Pickup handoff signed"
        : "Awaiting pickup handoff";
      return {
        id: l.id,
        from: l.pickupCity,
        to: l.dropoffCity,
        eta: "Today",
        status,
        handoffNote,
        ePODRequestedAt: l.ePODRequestedAt?.toISOString() ?? null,
        price: Math.round((l.priceCents ?? 0) / 100),
        bids: l.bids?.map((b) => ({
          ...b,
          createdAt: b.createdAt.toISOString(),
        })),
        createdAt: l.createdAt.toISOString(),
        completedAt:
          l.ePODApprovedAt?.toISOString() ??
          l.payments?.find((p) => p.captured)?.releasedAt?.toISOString() ??
          null,
        bidAmount: acceptedBid ? acceptedBid.amountCents / 100 : null,
      };
    }) ?? [];

  const availableLoads =
    availableLoadsRaw
      .map((l) => {
        let miles = l.distance ?? 0;
        if (driverLocation && l.pickupLat != null && l.pickupLng != null) {
          const km = haversineKm(driverLocation.lat, driverLocation.lng, l.pickupLat, l.pickupLng);
          miles = Math.max(1, Math.round(km * 0.621371));
        }
        return {
          id: l.id,
          lane: `${l.pickupCity} → ${l.dropoffCity}`,
          body: l.vehicleType ?? "Vehicle",
          miles,
          pay: Math.round((l.priceCents ?? 0) / 100),
          instant: true,
          pickupLat: l.pickupLat,
          pickupLng: l.pickupLng,
        };
      })
      .sort((a, b) => a.miles - b.miles) ?? [];

  const earnings: EarningItem[] =
    earningsRaw?.map((e) => ({
      id: e.id,
      jobId: e.jobId,
      amountCents: e.amountCents,
      status: e.status as EarningItem["status"],
      approvedAt: e.approvedAt?.toISOString() ?? null,
      paidAt: e.paidAt?.toISOString() ?? null,
      lane: `${e.job.pickupCity} → ${e.job.dropoffCity}`,
      payout: e.payout
        ? {
            method: e.payout.method as "WEEKLY_ACH" | "INSTANT_DEBIT",
            destinationMask: e.payout.destinationMask,
            status: e.payout.status as "CREATED" | "PROCESSING" | "SUCCEEDED" | "FAILED",
            railUsed: e.payout.railUsed as
              | "FEDNOW"
              | "RTP"
              | "INSTANT_DEBIT"
              | "ACH_SAME_DAY"
              | "ACH_STANDARD"
              | null,
          }
        : null,
    })) ?? [];

  const earningsSummary = earnings.reduce(
    (acc, e) => {
      if (e.status === "PENDING") acc.pendingCents += e.amountCents;
      if (e.status === "APPROVED") acc.approvedCents += e.amountCents;
      if (e.status === "PAID") acc.paidCents += e.amountCents;
      return acc;
    },
    { pendingCents: 0, approvedCents: 0, paidCents: 0 }
  );

  const activeLoads = myLoadsMapped.filter((l) => l.status !== "DELIVERED").length;
  const approvedEarnings = Math.round(earningsSummary.approvedCents / 100);

  const initial: Initial = {
    name: session?.user?.name || "Driver",
    truck: "3-Car Open",
    city: "Dallas, TX",
    kpis: {
      activeLoads,
      milesToday: activeLoads * 80 || 164,
      weekEarnings: approvedEarnings, // USD
      onTimePct: 98,
      rating: 4.9,
    },
    loadsToday: myLoadsMapped.filter((l) => l.status !== "DELIVERED"),
    completedLoads: myLoadsMapped
      .filter((l) => l.status === "DELIVERED")
      .sort(
        (a, b) =>
          new Date(b.completedAt ?? b.createdAt ?? "").getTime() -
          new Date(a.completedAt ?? a.createdAt ?? "").getTime()
      ),
    nearbyBids: availableLoads,
    driverLocation: driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null,
    earnings: {
      summary: earningsSummary,
      items: earnings,
      instantFeeCents: getInstantFeeCents(),
    },
  };

  return (
    <>
      <div className="px-4 py-3">
        <AuthStatus initialUser={initialUser} />
      </div>
      <DriverDashboardClient initial={initial} />
    </>
  );
}
