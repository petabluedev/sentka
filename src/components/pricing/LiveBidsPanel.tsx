// src/components/pricing/LiveBidsPanel.tsx
"use client";

import { useEffect, useState } from "react";

type Bid = { id: number; label: string; amount: number };

const MODEL_PRICE = 780;
const INITIAL_BIDS: Bid[] = [
  { id: 1, label: "SUV #1", amount: 802 },
  { id: 2, label: "Sedan #1", amount: 847 },
  { id: 3, label: "Truck #2", amount: 873 },
  { id: 4, label: "Enclosed #3", amount: 761 },
  { id: 5, label: "Motorcycle #4", amount: 722 },
  { id: 6, label: "SUV #6", amount: 838 },
];

export default function LiveBidsPanel() {
  const [bids, setBids] = useState<Bid[]>(INITIAL_BIDS);

  useEffect(() => {
    const id = setInterval(() => {
      setBids((prev) => {
        const next = [...prev];
        if (next.length === 0) return INITIAL_BIDS;
        const idx = Math.floor(Math.random() * next.length);
        next[idx] = { ...next[idx], amount: jiggle(next[idx].amount) };
        return next;
      });
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Realtime</span>
        <span>Model: <b className="text-slate-700">${MODEL_PRICE}</b></span>
      </div>

      <div className="space-y-2">
        {bids.map((b) => (
          <BidRow key={b.id} model={MODEL_PRICE} {...b} />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
        <Legend color="bg-emerald-500" label="under model" />
        <Legend color="bg-slate-400" label="around model" />
        <Legend color="bg-rose-500" label="over model" />
      </div>
    </div>
  );
}

function BidRow({ label, amount, model }: { label: string; amount: number; model: number }) {
  const diff = amount - model;

  let tone = "text-slate-800";
  let badge = "bg-slate-400";
  if (diff <= -1 * model * 0.06) {          // ≥6% below model → green (cheaper)
    badge = "bg-emerald-500";
    tone = "text-emerald-700";
  } else if (diff >= model * 0.06) {        // ≥6% above model → red (expensive)
    badge = "bg-rose-500";
    tone = "text-rose-700";
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${badge}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${tone}`}>${Math.round(amount)}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function jiggle(x: number) {
  return Math.max(580, Math.min(1050, x + (Math.random() - 0.5) * 35));
}
