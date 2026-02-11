// src/app/(shipper)/dashboard/page.tsx
import { headers, cookies } from "next/headers";
import dynamic from "next/dynamic";
import LiveRibbon from "@/components/pricing/LiveRibbon";
import LiveBidsPanel from "@/components/pricing/LiveBidsPanel";
import PostLoadForm from "@/components/forms/PostLoadForm";
import { apiUrl } from "@/lib/api";
import AuthStatus from "@/components/auth/AuthStatus";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import LoadActions from "@/components/loads/LoadActions";
import prisma from "@/lib/prisma";

const ShipperDriversMap = dynamic(() => import("@/components/maps/ShipperDriversMap"), { ssr: false });

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

const workflowSteps = [
  {
    title: "Post your load",
    description: "Pick the corridor route, set price, and lock in details in under a minute.",
  },
  {
    title: "Signal price confidence",
    description: "Our pricing engine nudges fair-market rates every ~90s to drive fast matches.",
  },
  {
    title: "Carriers engage live",
    description: "Carriers instant-book or counter inside your live feed—no back-and-forth emails.",
  },
  {
    title: "Track, deliver, payout",
    description: "Mark POD, trigger payout, and keep visibility on every milestone.",
  },
];

export default async function DashboardPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  const initialUser = session?.user
    ? { email: session.user.email, username: (session.user as any).username ?? "", role: session.user.role }
    : null;
  const [loads, driverMarkers] = await Promise.all([getLoads(), getDriverMarkers()]);

  const totalValue = loads.reduce((sum, l) => sum + (l.priceCents ?? 0), 0);
  const enclosedCount = loads.filter((l) => l.enclosed).length;
  const inoperable = loads.filter((l) => l.operable === false).length;

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
            <StatCard label="Active loads" value={loads.length} />
            <StatCard label="Value posted" value={formatMoney(totalValue)} hint="all-in" />
            <StatCard label="Enclosed requests" value={enclosedCount} />
            <StatCard label="Inoperable" value={inoperable} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-sky-50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700">Pricing signal</div>
          <div className="mt-2 text-sm text-slate-700">
            Dallas → Atlanta · SUV · operable
          </div>
          <div className="mt-3">
            <LiveRibbon />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card title="Create a load">
            <PostLoadForm />
          </Card>

          <Card title="Recent loads">
            {loads.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-2">
                {loads.map((load, idx) => (
                  <LoadRow key={load.id ?? idx} load={load} index={idx} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Live nearby bids">
            <LiveBidsPanel />
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
          <Card title="Workflow">
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-amber-700">
                <span className="uppercase tracking-wide">Fast lane</span>
                <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] text-amber-700 shadow-sm">~4 min</span>
              </div>
              <ol className="mt-3 space-y-3">
                {workflowSteps.map((step, idx) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="w-full rounded-xl border border-white/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
                      <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                      <p className="text-xs leading-snug text-slate-600">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-900/10 bg-slate-900 px-4 py-3 text-white shadow-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-emerald-200">Tip</div>
                  <div className="text-sm font-semibold leading-snug">Peak acceptances hit 9a-3p along the corridor.</div>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-emerald-100 shadow-inner">
                  Live guidance
                </span>
              </div>
            </div>
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

function LoadRow({ load, index }: { load: Load; index: number }) {
  // Show a more realistic default stage; avoid "Draft" when a load is posted.
  const stages = ["Posted", "Pending bids", "Dispatched", "Delivered"];
  const stage = stages[Math.min(index, stages.length - 1)];
  const tone =
    stage === "Posted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : index % 2 === 0
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-sky-50 text-sky-700 border-sky-200";
  const acceptedBid = load.bids?.find((b) => b.status === "ACCEPTED");

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">
          {load.pickupCity} → {load.dropoffCity}
        </div>
        <div className="text-xs text-slate-500">
          {load.vehicleType ?? "Vehicle"} {load.vehicle ? `• ${load.vehicle}` : ""}{" "}
          {load.enclosed ? "• Enclosed" : ""} {load.operable === false ? "• Inoperable" : ""}
          {typeof load.distance === "number" ? ` • ${load.distance} mi` : ""}
        </div>
        {load.bids && load.bids.length ? (
          <div className="mt-1 text-[11px] text-slate-500">
            {load.bids.filter((b) => b.status === "PENDING").length} pending bids ·{" "}
            {load.bids.filter((b) => b.status === "ACCEPTED").length ? "accepted" : "awaiting decision"}
          </div>
        ) : null}
        {load.bids?.find((b) => b.status === "PENDING") ? (
          <button
            className="mt-2 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={async () => {
              const bid = load.bids?.find((b) => b.status === "PENDING");
              if (!bid) return;
              await fetch(`/api/bids/${bid.id}/accept`, { method: "POST", credentials: "include" });
              location.reload();
            }}
          >
            Accept top bid
          </button>
        ) : null}
        <div className="mt-2">
          <LoadActions
            loadId={load.id}
            paymentId={load.payments?.[0]?.id}
            captured={load.payments?.[0]?.captured}
            epodApproved={Boolean(load.ePODApprovedAt)}
            epodSignature={load.ePODSignature ?? null}
            pickupHandoffAt={load.pickupHandoffAt ?? null}
            pickupHandoffSignature={load.pickupHandoffSignature ?? null}
            hasAcceptedBid={Boolean(acceptedBid)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[11px] border px-2 py-0.5 rounded-full ${tone}`}>{stage}</span>
        <div className="text-right">
          <div className="text-base font-bold">{formatMoney(load.priceCents)}</div>
          <div className="text-[11px] text-slate-500">all-in</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
      No loads yet. Post your first pickup/dropoff to see live pricing and bids.
    </div>
  );
}
