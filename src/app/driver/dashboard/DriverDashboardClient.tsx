// src/app/(driver)/dashboard/DriverDashboardClient.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Truck, Star, DollarSign } from "lucide-react";
import DriverLoadsMap from "@/components/maps/DriverLoadsMap";

// ---------- Types ----------
type KPI = { activeLoads: number; milesToday: number; weekEarnings: number; onTimePct: number; rating: number };
type Load = {
  id: string;
  from: string;
  to: string;
  eta: string;
  status: "EN-ROUTE" | "PICKED" | "DELIVERED";
  price: number;
  handoffNote?: string;
  bids?: { id: string; amountCents: number; status: string }[];
  createdAt?: string | null;
  completedAt?: string | null;
  bidAmount?: number | null;
};
type NearbyBid = {
  id: string;
  lane: string;
  body: string;
  miles: number;
  pay: number;
  pickupLat?: number | null;
  pickupLng?: number | null;
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
type EarningsSummary = { pendingCents: number; approvedCents: number; paidCents: number };

export type Initial = {
  name: string;
  truck: string;
  city: string;
  kpis: KPI;
  loadsToday: Load[];
  completedLoads: Load[];
  nearbyBids: NearbyBid[];
  driverLocation?: { lat: number; lng: number } | null;
  earnings: { summary: EarningsSummary; items: EarningItem[]; instantFeeCents: number };
};

export default function DriverDashboardClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const loadsToday = initial.loadsToday ?? [];
  const completedLoads = initial.completedLoads ?? [];
  const nearby = initial.nearbyBids ?? [];
  const driverLocation = initial.driverLocation ?? null;
  const bids = nearby;
  const earnings = initial.earnings?.items ?? [];
  const earningsSummary = initial.earnings?.summary ?? { pendingCents: 0, approvedCents: 0, paidCents: 0 };
  const instantFeeCents = initial.earnings?.instantFeeCents ?? 125;
  const [earningsTab, setEarningsTab] = useState<"PENDING" | "APPROVED" | "PAID">("APPROVED");
  const [instantStatus, setInstantStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [instantError, setInstantError] = useState<string | null>(null);
  const [completedSortDesc, setCompletedSortDesc] = useState(true);
  const instantKeyRef = useRef<string | null>(null);

  const k = initial.kpis;
  const filteredEarnings = useMemo(
    () => earnings.filter((e) => e.status === earningsTab),
    [earnings, earningsTab]
  );
  const canInstant = earningsSummary.approvedCents > 0;

  async function handleInstantPayout() {
    if (!canInstant || instantStatus === "loading") return;
    setInstantStatus("loading");
    setInstantError(null);
    try {
      if (!instantKeyRef.current) {
        instantKeyRef.current =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      }
      const idempotencyKey = instantKeyRef.current;
      const res = await fetch("/api/drivers/me/payouts/instant", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error(data?.error || "Instant payout failed");
      }
      setInstantStatus("done");
      instantKeyRef.current = null;
      setTimeout(() => setInstantStatus("idle"), 1200);
      router.refresh();
    } catch (err: any) {
      setInstantError(err?.message || "Instant payout failed");
      setInstantStatus("error");
      setTimeout(() => setInstantStatus("idle"), 1500);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8" suppressHydrationWarning>
      {/* Header / identity */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white font-semibold">D</div>
            <h1 className="text-2xl font-bold tracking-tight">Driver Dashboard</h1>
          </div>
          <div className="mt-1 text-sm text-gray-600 flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {initial.truck}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {initial.city}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {k.rating.toFixed(1)} rating</span>
          </div>
        </div>

        {/* Intelligent pricing ribbon */}
        <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-sky-50 px-4 py-3">
          <div className="text-xs font-medium text-emerald-700">INTELLIGENT PRICING</div>
          <div className="text-sm text-gray-700">Live bids adjust to lane demand across active routes.</div>
        </div>
      </div>

      {/* KPI cards */}
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Active loads" value={k.activeLoads} />
        <KpiCard label="Miles today" value={`${k.milesToday} mi`} />
        <KpiCard
          label="Approved earnings"
          value={`$${k.weekEarnings.toLocaleString("en-US")}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard label="On-time" value={`${k.onTimePct}%`} />
        <KpiCard label="Rating" value={k.rating.toFixed(1)} icon={<Star className="h-4 w-4" />} />
      </section>

      {/* Main 2-column layout */}
      <section className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: My loads today */}
        <div className="lg:col-span-7">
          <Card title="My loads today">
            <div className="divide-y">
              {loadsToday.length === 0 ? (
                <div className="py-6 text-sm text-gray-500">No awarded loads yet. Bid on a lane to get started.</div>
              ) : null}
              {loadsToday.map((l) => (
                <LoadRow key={l.id} {...l} />
              ))}
            </div>
          </Card>
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>Completed bids</span>
                <button
                  className="text-xs text-gray-500 hover:text-gray-800"
                  onClick={() => setCompletedSortDesc((v) => !v)}
                >
                  Sort: {completedSortDesc ? "Newest" : "Oldest"}
                </button>
              </div>
            }
          >
            <div className="divide-y">
              {completedLoads
                .slice()
                .sort((a, b) => {
                  const da = new Date(a.completedAt ?? a.createdAt ?? "").getTime();
                  const db = new Date(b.completedAt ?? b.createdAt ?? "").getTime();
                  return completedSortDesc ? db - da : da - db;
                })
                .map((l) => (
                  <LoadRow key={`completed-${l.id}`} {...l} />
                ))}
              {completedLoads.length === 0 ? (
                <div className="py-6 text-sm text-gray-500">No completed bids yet.</div>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Right: Earnings + Nearby bids */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Earnings">
            <div className="flex flex-wrap items-center gap-2">
              {(["PENDING", "APPROVED", "PAID"] as const).map((tab) => {
                const active = earningsTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setEarningsTab(tab)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      active ? "bg-black text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                );
              })}
              <span className="ml-auto text-[11px] text-slate-500">Weekly ACH: Monday 6:00am</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <StatMini label="Pending" value={formatMoney(earningsSummary.pendingCents)} />
              <StatMini label="Approved" value={formatMoney(earningsSummary.approvedCents)} />
              <StatMini label="Paid" value={formatMoney(earningsSummary.paidCents)} />
            </div>

            {earningsTab === "APPROVED" ? (
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    Instant payout fee: {formatMoney(instantFeeCents)} (only if instant completes under 5 minutes).
                    ACH fallback is free.
                  </div>
                  {canInstant ? (
                    <button
                      onClick={handleInstantPayout}
                      disabled={instantStatus === "loading"}
                      className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {instantStatus === "loading" ? "Processing…" : "Cash out now"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500">No approved earnings yet</span>
                  )}
                </div>
                {instantError ? <div className="mt-2 text-[11px] text-red-600">{instantError}</div> : null}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {filteredEarnings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                  No {earningsTab.toLowerCase()} earnings yet.
                </div>
              ) : (
                filteredEarnings.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800">{e.lane}</div>
                      <div className="text-[11px] text-slate-500">
                        {earningsTab === "PAID"
                          ? formatDepositLabel(e.payout)
                          : earningsTab === "APPROVED"
                          ? "Approved for payout"
                          : "Awaiting approval"}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{formatMoney(e.amountCents)}</div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Load map">
            <DriverLoadsMap loads={nearby} driverLocation={driverLocation} />
          </Card>

          <Card title="Nearby bids">
            <div className="space-y-2">
              {bids.map((b) => (
                <BidRow key={b.id} bid={b} />
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

// ---------- UI bits (inline, Tailwind-only) ----------

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-5 py-4 border-b">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-xl font-semibold">
        {icon ? <span className="text-gray-700">{icon}</span> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDepositLabel(
  payout?: {
    method: "WEEKLY_ACH" | "INSTANT_DEBIT";
    destinationMask?: string | null;
    status?: "CREATED" | "PROCESSING" | "SUCCEEDED" | "FAILED";
    railUsed?: "FEDNOW" | "RTP" | "INSTANT_DEBIT" | "ACH_SAME_DAY" | "ACH_STANDARD" | null;
  } | null
) {
  if (!payout) return "Deposited";
  const mask = payout.destinationMask ? ` ••••${payout.destinationMask}` : "";
  const isAch = payout.railUsed === "ACH_SAME_DAY" || payout.railUsed === "ACH_STANDARD";
  if (payout.status !== "SUCCEEDED" || isAch) {
    return `Scheduled to Bank${mask}`;
  }
  if (payout.railUsed === "INSTANT_DEBIT") {
    return `Deposited to Debit${mask} (Instant)`;
  }
  return `Deposited to Bank${mask} (Instant)`;
}

function StatusPill({ status }: { status: Load["status"] }) {
  const m =
    status === "EN-ROUTE"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "PICKED"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return <span className={`text-xs border px-2 py-0.5 rounded-full ${m}`}>{status}</span>;
}

function LoadRow(l: Load) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [bidStatus, setBidStatus] = useState<string>(l.bids?.find((b) => b.status === "PENDING" || b.status === "ACCEPTED")?.status || "NONE");

  async function placeBid() {
    if (status === "loading" || bidStatus === "ACCEPTED") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadId: l.id, amountCents: Math.round(l.price * 100) }),
      });
      if (!res.ok) throw new Error("fail");
      setStatus("done");
      setBidStatus("PENDING");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  const label =
    bidStatus === "ACCEPTED"
      ? "Bid accepted"
      : status === "loading"
      ? "Bidding..."
      : status === "done"
      ? "Bid sent"
      : status === "error"
      ? "Retry bid"
      : "Bid";

  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0">
        <div className="font-medium truncate">{l.from} → {l.to}</div>
        <div className="text-xs text-gray-500">
          ID {l.id} · ETA {l.eta}
          {l.handoffNote ? ` · ${l.handoffNote}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusPill status={l.status} />
        <div className="text-right">
          <div className="text-sm font-semibold">${l.bidAmount ?? l.price}</div>
          <div className="text-xs text-gray-500">all-in</div>
        </div>
        <button
          onClick={placeBid}
          disabled={status === "loading" || bidStatus === "ACCEPTED"}
          className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-60"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

function BidRow({ bid }: { bid: NearbyBid }) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-3 py-2">
      <div className="min-w-0">
        <div className="font-medium truncate">{bid.lane}</div>
        <div className="text-xs text-gray-500">{bid.body} · {bid.miles} mi</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
          ${bid.pay}
        </span>
        <AcceptButton bid={bid} />
      </div>
    </div>
  );
}

function AcceptButton({ bid }: { bid: NearbyBid }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const router = useRouter();

  async function accept() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadId: bid.id, amountCents: Math.round(bid.pay * 100), instantAccept: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error(data?.error || "Failed");
      }
      setStatus("done");
      router.refresh();
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  const label =
    status === "loading" ? "Booking..." : status === "done" ? "Booked" : status === "error" ? "Retry" : "Book";

  return (
    <button
      onClick={accept}
      disabled={status === "loading" || status === "done"}
      className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
