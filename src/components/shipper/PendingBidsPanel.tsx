"use client";

import { useEffect, useRef, useState } from "react";

type Bid = {
  id: string;
  amountCents: number;
  status: string;
  driverId: string;
  createdAt?: string;
};

type Load = {
  id: string;
  pickupCity: string;
  dropoffCity: string;
  bids?: Bid[];
};

type PendingBid = {
  id: string;
  loadId: string;
  lane: string;
  amountCents: number;
  createdAt?: string;
};

type Props = {
  initialLoads: Load[];
  refreshMs?: number;
};

export default function PendingBidsPanel({ initialLoads, refreshMs = 3000 }: Props) {
  const [loads, setLoads] = useState<Load[]>(initialLoads);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const res = await fetch("/api/loads", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        if (active && Array.isArray(data)) {
          setLoads(data);
        }
      } catch {
        // ignore
      } finally {
        if (active) timerRef.current = window.setTimeout(refresh, refreshMs);
      }
    }

    timerRef.current = window.setTimeout(refresh, refreshMs);
    return () => {
      active = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [refreshMs]);

  const pendingBids = loads
    .flatMap((load) =>
      (load.bids ?? [])
        .filter((b) => b.status === "PENDING")
        .map((b) => ({
          id: b.id,
          loadId: load.id,
          lane: `${load.pickupCity} → ${load.dropoffCity}`,
          amountCents: b.amountCents,
          createdAt: b.createdAt,
        }))
    )
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });

  if (!pendingBids.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
        No pending bids yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pendingBids.map((bid) => (
        <PendingBidRow key={bid.id} bid={bid} />
      ))}
    </div>
  );
}

function PendingBidRow({ bid }: { bid: PendingBid }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function accept() {
    if (status === "loading" || status === "done") return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/bids/${bid.id}/accept`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      setStatus("done");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1200);
    }
  }

  const label = status === "loading" ? "Accepting..." : status === "done" ? "Accepted" : status === "error" ? "Retry" : "Accept";

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{bid.lane}</div>
        <div className="text-xs text-slate-500">Bid ${Math.round(bid.amountCents / 100)}</div>
      </div>
      <button
        onClick={accept}
        disabled={status === "loading" || status === "done"}
        className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {label}
      </button>
    </div>
  );
}
