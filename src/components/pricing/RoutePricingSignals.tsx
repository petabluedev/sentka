"use client";

import { useEffect, useMemo, useState } from "react";

export type RoutePricingSignal = {
  id: string;
  lane: string;
  ask: number;
  fair: number;
  watchers: number;
  confidence: number;
};

type Signal = RoutePricingSignal & {
  trend: "up" | "down" | "flat";
  delta: number;
};

type Props = {
  routes: RoutePricingSignal[];
};

export default function RoutePricingSignals({ routes }: Props) {
  const initial = useMemo(() => {
    const base = routes.length ? routes : defaultRoutes();
    return base.map(toSignal);
  }, [routes]);
  const [signals, setSignals] = useState<Signal[]>(initial);

  useEffect(() => {
    setSignals(initial);
  }, [initial]);

  useEffect(() => {
    const id = setInterval(() => {
      setSignals((prev) =>
        prev.map((signal) => {
          const ask = clamp(Math.round(signal.ask + jitter(12)), 350, 1500);
          const fair = clamp(Math.round(signal.fair + jitter(6)), 300, 1400);
          const delta = ask - fair;
          const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
          const watchers = clamp(signal.watchers + Math.round(jitter(2)), 6, 40);
          const confidence = clampFloat(signal.confidence + jitter(0.03), 0.55, 0.95);
          return { ...signal, ask, fair, delta, trend, watchers, confidence };
        })
      );
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      <div className="max-h-64 space-y-3 overflow-y-auto pr-2">
        {signals.map((signal) => (
          <PricingSignalRow key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}

function PricingSignalRow({ signal }: { signal: Signal }) {
  const deltaAbs = Math.abs(signal.delta);
  const color =
    signal.trend === "up"
      ? "bg-emerald-600"
      : signal.trend === "down"
      ? "bg-rose-600"
      : "bg-slate-600";
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-700">Intelligent pricing</div>
          <div className="text-sm font-semibold text-slate-900 truncate">{signal.lane}</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="text-lg font-semibold text-slate-900">${signal.ask}</span>
          <span>
            fair: <b className="tabular-nums">${signal.fair}</b>
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] text-white ${color}`}>
            {signal.trend === "up" ? "↑" : signal.trend === "down" ? "↓" : "→"} ${deltaAbs}
          </span>
          <span className="ml-1">watchers</span>
          <b className="tabular-nums">{signal.watchers}</b>
          <span className="ml-1">confidence</span>
          <b className="tabular-nums">{Math.round(signal.confidence * 100)}%</b>
        </div>
      </div>
    </div>
  );
}

function toSignal(route: RoutePricingSignal): Signal {
  const delta = route.ask - route.fair;
  const trend: Signal["trend"] = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { ...route, delta, trend };
}

function jitter(scale: number) {
  return (Math.random() - 0.5) * scale;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampFloat(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function defaultRoutes(): RoutePricingSignal[] {
  return [
    { id: "route_dal_atl", lane: "Dallas → Atlanta", ask: 780, fair: 742, watchers: 14, confidence: 0.76 },
    { id: "route_atl_dal", lane: "Atlanta → Dallas", ask: 765, fair: 728, watchers: 12, confidence: 0.74 },
    { id: "route_sat_atl", lane: "San Antonio → Atlanta", ask: 940, fair: 886, watchers: 9, confidence: 0.68 },
    { id: "route_atl_sat", lane: "Atlanta → San Antonio", ask: 910, fair: 864, watchers: 8, confidence: 0.66 },
    { id: "route_hou_dal", lane: "Houston → Dallas", ask: 620, fair: 598, watchers: 11, confidence: 0.72 },
    { id: "route_dal_hou", lane: "Dallas → Houston", ask: 635, fair: 604, watchers: 10, confidence: 0.71 },
    { id: "route_sat_hou", lane: "San Antonio → Houston", ask: 540, fair: 518, watchers: 9, confidence: 0.7 },
    { id: "route_hou_sat", lane: "Houston → San Antonio", ask: 552, fair: 520, watchers: 8, confidence: 0.69 },
    { id: "route_atl_hou", lane: "Atlanta → Houston", ask: 880, fair: 835, watchers: 13, confidence: 0.75 },
    { id: "route_hou_atl", lane: "Houston → Atlanta", ask: 895, fair: 848, watchers: 12, confidence: 0.73 },
    { id: "route_atl_sat", lane: "Atlanta → San Antonio", ask: 915, fair: 862, watchers: 7, confidence: 0.64 },
    { id: "route_dal_sat", lane: "Dallas → San Antonio", ask: 515, fair: 492, watchers: 6, confidence: 0.62 },
  ];
}
