// src/app/(shipper)/dashboard/page.tsx
import { headers, cookies } from "next/headers";
import dynamicImport from "next/dynamic";
import PendingBidsPanel from "@/components/shipper/PendingBidsPanel";
import PostLoadForm from "@/components/forms/PostLoadForm";
import { apiUrl } from "@/lib/api";
import AuthStatus from "@/components/auth/AuthStatus";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import prisma from "@/lib/prisma";
import RecentLoads from "@/components/shipper/RecentLoads";
import RoutePricingSignals from "@/components/pricing/RoutePricingSignals";

const ShipperDriversMap = dynamicImport(() => import("@/components/maps/ShipperDriversMap"), { ssr: false });

export const dynamic = "force-dynamic";

type Load = {
  id: string;
  pickupCity: string;
  dropoffCity: string;
  priceCents: number;
  vehicle?: string;
  vehicleType?: string;
  enclosed?: boolean;
  operable?: boolean;
  distance?: number | null;
  createdAt?: string;
  ePODApprovedAt?: string | null;
  ePODSignature?: string | null;
  pickupHandoffAt?: string | null;
  pickupHandoffSignature?: string | null;
  payments?: {
    id: string;
    status: string;
    captured: boolean;
    paymentIntentId: string;
    payeeId?: string | null;
    payeeConnectId?: string | null;
    transferId?: string | null;
  }[];
  bids?: { id: string; amountCents: number; status: string; driverId: string }[];
};

type DriverMarker = {
  id: string;
  name: string;
  status: "ONLINE" | "ON_TRIP" | "PAUSED";
  lat: number;
  lng: number;
  lastSeenAt?: string | null;
};

function getBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host")!;
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0];
  return `${proto}://${host}`;
}

async function getLoads(): Promise<Load[]> {
  const res = await fetch(apiUrl("/api/loads", { origin: getBaseUrl() }), { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

function obfuscateCoord(coord: number) {
  return Math.round(coord * 100) / 100;
}

async function getDriverMarkers(): Promise<DriverMarker[]> {
  const drivers = await prisma.user.findMany({
    where: {
      role: "DRIVER",
      driverStatus: { availability: { in: ["ONLINE", "ON_TRIP", "PAUSED"] } },
    },
    include: {
      driverLocation: true,
      driverStatus: true,
    },
    take: 200,
  });

  return drivers
    .filter((d) => d.driverLocation)
    .map((d) => ({
      id: d.id,
      name: d.name || d.username || d.email,
      status: (d.driverStatus?.availability as DriverMarker["status"]) ?? "PAUSED",
      lat: obfuscateCoord(d.driverLocation!.lat),
      lng: obfuscateCoord(d.driverLocation!.lng),
      lastSeenAt: d.driverStatus?.lastSeenAt?.toISOString() ?? null,
    }));
}

function formatMoney(cents: number) {
  // Fix locale to avoid SSR/CSR differences that cause hydration mismatches.
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}


export default async function DashboardPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  const initialUser = session?.user
    ? { email: session.user.email, username: (session.user as any).username ?? "", role: session.user.role }
    : null;
  const [loads, driverMarkers] = await Promise.all([getLoads(), getDriverMarkers()]);

  const activeLoads = loads.filter(
    (l) => !l.ePODApprovedAt && !l.payments?.some((p) => p.captured)
  );
  const totalValue = activeLoads.reduce((sum, l) => sum + (l.priceCents ?? 0), 0);
  const enclosedCount = activeLoads.filter((l) => l.enclosed).length;
  const inoperable = activeLoads.filter((l) => l.operable === false).length;
  const pricingSignals = buildPricingSignals(activeLoads);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-10" suppressHydrationWarning>
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr] items-start">
        <div className="space-y-3">
          <AuthStatus initialUser={initialUser} />
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Live shipper workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Shipper Dashboard</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Post loads, watch live carrier bids, and keep tabs on pricing confidence.
            Everything here stays in sync between SSR/CSR to avoid hydration mismatches.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active loads" value={activeLoads.length} />
            <StatCard label="Value posted" value={formatMoney(totalValue)} hint="all-in" />
            <StatCard label="Enclosed requests" value={enclosedCount} />
            <StatCard label="Inoperable" value={inoperable} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-sky-50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700">Intelligent pricing (all routes)</div>
          <div className="mt-3">
            <RoutePricingSignals routes={pricingSignals} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card title="Create a load">
            <PostLoadForm />
          </Card>
          <Card title="Available drivers (approx)">
            {driverMarkers.length ? (
              <ShipperDriversMap drivers={driverMarkers} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No online drivers yet.
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Pending bids">
            <PendingBidsPanel initialLoads={loads} />
          </Card>
          <Card title="Recent loads">
            <RecentLoads initialLoads={loads} />
          </Card>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

type PricingSignal = {
  id: string;
  lane: string;
  ask: number;
  fair: number;
  watchers: number;
  confidence: number;
};

function buildPricingSignals(loads: Load[]): PricingSignal[] {
  const laneMap = new Map<string, Load>();
  const sorted = [...loads].sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });
  for (const load of sorted) {
    const key = `${load.pickupCity}|${load.dropoffCity}`;
    if (!laneMap.has(key)) laneMap.set(key, load);
  }

  return Array.from(laneMap.values()).map((load) => {
    const ask = Math.max(1, Math.round((load.priceCents ?? 0) / 100));
    const fair = Math.max(1, Math.round(ask * 0.94));
    const bids = load.bids?.length ?? 0;
    const watchers = Math.min(40, Math.max(6, bids * 3 + 6));
    const confidence = Math.min(0.92, 0.6 + bids * 0.05);
    return {
      id: load.id,
      lane: `${load.pickupCity} → ${load.dropoffCity}`,
      ask,
      fair,
      watchers,
      confidence,
    };
  });
}
