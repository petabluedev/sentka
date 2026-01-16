// src/app/driver/dashboard/page.tsx
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import type { Initial } from "@/app/driver/dashboard/DriverDashboardClient";
import AuthStatus from "@/components/auth/AuthStatus";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import prisma from "@/lib/prisma";

const DriverDashboardClient = dynamic(() => import("@/app/driver/dashboard/DriverDashboardClient"), {
  ssr: false,
});

export const metadata = { title: "Driver Dashboard • Sentka" };

type Load = {
  id: string;
  pickupCity: string;
  dropoffCity: string;
  priceCents: number;
  enclosed?: boolean;
  operable?: boolean;
  vehicleType?: string;
  distance?: number | null;
  createdAt?: string;
  ePODApprovedAt?: string | null;
  payments?: { captured: boolean; releasedAt?: string | null }[];
  bids?: { id: string; driverId: string; status: string; amountCents: number; createdAt: string }[];
};

export default async function DriverDashboardPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  const initialUser = session?.user
    ? { email: session.user.email, username: (session.user as any).username ?? "", role: session.user.role }
    : null;

  const driverId = session?.user?.id ?? null;

  const [availableLoadsRaw, myLoadsRaw] = await Promise.all([
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
  ]);

  const myLoadsMapped =
    myLoadsRaw?.map((l) => {
      const acceptedBid = l.bids?.find((b) => b.status === "ACCEPTED");
      const completed = Boolean(l.ePODApprovedAt || l.payments?.some((p) => p.captured));
      const status = completed ? ("DELIVERED" as const) : ("PICKED" as const);
      return {
        id: l.id,
        from: l.pickupCity,
        to: l.dropoffCity,
        eta: "Today",
        status,
        price: Math.round((l.priceCents ?? 0) / 100),
        bids: l.bids,
        createdAt: l.createdAt,
        completedAt: l.ePODApprovedAt ?? l.payments?.find((p) => p.captured)?.releasedAt ?? null,
        bidAmount: acceptedBid ? acceptedBid.amountCents / 100 : null,
      };
    }) ?? [];

  const availableLoads =
    availableLoadsRaw.map((l) => ({
      id: l.id,
      lane: `${l.pickupCity} → ${l.dropoffCity}`,
      body: l.vehicleType ?? "Vehicle",
      miles: l.distance ?? 0,
      pay: Math.round((l.priceCents ?? 0) / 100),
      instant: true,
    })) ?? [];

  const activeLoads = myLoadsMapped.filter((l) => l.status !== "DELIVERED").length;
  const weekEarnings = myLoadsMapped.reduce((sum, l) => sum + (l.bidAmount ?? l.price ?? 0), 0);

  const initial: Initial = {
    name: session?.user?.name || "Driver",
    truck: "3-Car Open",
    city: "Dallas, TX",
    kpis: {
      activeLoads,
      milesToday: activeLoads * 80 || 164,
      weekEarnings, // USD
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
