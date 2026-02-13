// src/components/pricing/PricingRibbon.tsx
"use client";

export type PricingRibbonProps = {
  fairPrice: number;
  askPrice: number;
  changeAbs: number;
  trend: "up" | "down" | "flat";
  confidence: number; // 0–1
  watchers: number;
};

export default function PricingRibbon({
  fairPrice,
  askPrice,
  changeAbs,
  trend,
  confidence,
  watchers,
}: PricingRibbonProps) {
  const color =
    trend === "up" ? "bg-emerald-600" : trend === "down" ? "bg-rose-600" : "bg-slate-600";

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-slate-600">Intelligent pricing</span>
        <span className="text-2xl font-semibold tabular-nums">${askPrice}</span>
        <span className="text-sm text-slate-600">
          fair: <b className="tabular-nums">${fairPrice}</b>
        </span>

        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs text-white ${color}`}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} ${Math.abs(changeAbs)}
        </span>

        <span className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          <span>watchers</span>
          <b className="tabular-nums">{watchers}</b>
          <span className="ml-3">confidence</span>
          <b className="tabular-nums">{Math.round(confidence * 100)}%</b>
        </span>
      </div>
    </div>
  );
}
