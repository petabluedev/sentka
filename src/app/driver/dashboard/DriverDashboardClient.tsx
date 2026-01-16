// src/app/(driver)/dashboard/DriverDashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, MapPin, Truck, Star, DollarSign, Timer } from "lucide-react";

// ---------- Types ----------
type KPI = { activeLoads: number; milesToday: number; weekEarnings: number; onTimePct: number; rating: number };
type Load = {
  id: string;
  from: string;
  to: string;
  eta: string;
  status: "EN-ROUTE" | "PICKED" | "DELIVERED";
  price: number;
  bids?: { id: string; amountCents: number; status: string }[];
  createdAt?: string | null;
  completedAt?: string | null;
  bidAmount?: number | null;
};
type NearbyBid = { id: string; lane: string; body: string; miles: number; pay: number };
type Acceptable = { id: string; type: "load" | "bid"; payloadId: string };

export type Initial = {
  name: string;
  truck: string;
  city: string;
  kpis: KPI;
  loadsToday: Load[];
  completedLoads: Load[];
  nearbyBids: NearbyBid[];
};

export default function DriverDashboardClient({ initial }: { initial: Initial }) {
  const loadsToday = initial.loadsToday ?? [];
  const completedLoads = initial.completedLoads ?? [];
  const nearby = initial.nearbyBids ?? [];

  // live price “wiggle” for nearby bids
  const [bids, setBids] = useState(nearby);
  const [pulse, setPulse] = useState(0);
  const [completedSortDesc, setCompletedSortDesc] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setPulse((n) => n + 1);
      setBids((prev) =>
        prev.map((b) => {
          // tiny random movement
          const d = Math.round((Math.random() - 0.5) * 10);
          return { ...b, pay: Math.max(120, b.pay + d) };
        })
      );
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const k = initial.kpis;

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
          <div className="text-sm text-gray-700">
            Live bids adjust to lane demand. <span className="font-medium">Instant-book eligible</span> loads highlighted in green.
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Active loads" value={k.activeLoads} />
        <KpiCard label="Miles today" value={`${k.milesToday} mi`} />
        <KpiCard
          label="Earnings (week)"
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

        {/* Right: Live nearby bids */}
        <div className="lg:col-span-5">
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>Live nearby bids</span>
                <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" />
                  refresh {2 - (pulse % 2)}s
                </span>
              </div>
            }
          >
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
        <div className="text-xs text-gray-500">ID {l.id} · ETA {l.eta}</div>
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
  // Simple “direction” based on last digit
  const up = bid.pay % 2 === 0;
  const TrendIcon = up ? ArrowUpRight : ArrowDownRight;
  const trendColor = up ? "text-emerald-600" : "text-rose-600";
  const pill =
    up
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className="flex items-center justify-between rounded-xl border px-3 py-2">
      <div className="min-w-0">
        <div className="font-medium truncate">{bid.lane}</div>
        <div className="text-xs text-gray-500">{bid.body} · {bid.miles} mi</div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          ${bid.pay}
        </span>
        <span className={`text-[10px] border px-2 py-0.5 rounded-full ${pill}`}>
          {up ? "instant-book eligible" : "counter required"}
        </span>
        <AcceptButton bid={bid} />
      </div>
    </div>
  );
}

function AcceptButton({ bid }: { bid: NearbyBid }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function accept() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadId: bid.id, amountCents: Math.round(bid.pay * 100) }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  const label =
    status === "loading" ? "Accepting..." : status === "done" ? "Accepted" : status === "error" ? "Retry" : "Accept";

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
