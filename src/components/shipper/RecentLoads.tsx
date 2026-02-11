"use client";

import { useEffect, useRef, useState } from "react";
import LoadActions from "@/components/loads/LoadActions";

type Load = {
  id: string;
  pickupCity: string;
  dropoffCity: string;
  priceCents: number;
  assignmentStatus?: "UNASSIGNED" | "OFFERING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
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

type Props = {
  initialLoads: Load[];
  refreshMs?: number;
};

export default function RecentLoads({ initialLoads, refreshMs = 3000 }: Props) {
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
        // ignore transient failures
      } finally {
        if (active) {
          timerRef.current = window.setTimeout(refresh, refreshMs);
        }
      }
    }

    timerRef.current = window.setTimeout(refresh, refreshMs);
    return () => {
      active = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [refreshMs]);

  if (!loads.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
        No loads yet. Post your first pickup/dropoff to see live pricing and bids.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {loads.map((load, idx) => (
        <LoadRow key={load.id ?? idx} load={load} index={idx} />
      ))}
    </div>
  );
}

function LoadRow({ load, index }: { load: Load; index: number }) {
  const acceptedBid = load.bids?.find((b) => b.status === "ACCEPTED");
  const hasAcceptedBid = Boolean(acceptedBid);
  const hasPendingBid = Boolean(load.bids?.some((b) => b.status === "PENDING"));
  const stage = load.ePODApprovedAt
    ? "Delivered"
    : load.assignmentStatus === "ASSIGNED" || hasAcceptedBid
    ? "Accepted by driver"
    : hasPendingBid
    ? "Pending bids"
    : "Posted";
  const tone =
    stage === "Delivered"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : stage === "Accepted by driver"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : stage === "Posted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : index % 2 === 0
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-sky-50 text-sky-700 border-sky-200";
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">
          {load.pickupCity} → {load.dropoffCity}
        </div>
        <div className="text-xs text-slate-500">
          {load.vehicleType ?? "Vehicle"} {load.vehicle ? `• ${load.vehicle}` : ""} {load.enclosed ? "• Enclosed" : ""}{" "}
          {load.operable === false ? "• Inoperable" : ""}
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

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}
