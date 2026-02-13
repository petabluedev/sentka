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
    const base = mergeRoutes(defaultRoutes(), routes);
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
      <div className="max-h-72 space-y-2 overflow-y-auto pr-2">
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
    <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{signal.lane}</div>
          <div className="text-[11px] text-slate-500">fair ${signal.fair}</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="text-base font-semibold text-slate-900">${signal.ask}</span>
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
  const cities = ["Dallas", "Atlanta", "Houston", "San Antonio", "Austin"];
  const routes: RoutePricingSignal[] = [];
  for (const from of cities) {
    for (const to of cities) {
      if (from === to) continue;
      const seed = Math.abs(hash(`${from}-${to}`)) % 400;
      const ask = 520 + seed;
      const fair = Math.round(ask * 0.94);
      const watchers = 6 + (seed % 10);
      const confidence = 0.6 + (seed % 20) / 100;
      routes.push({
        id: `route_${slug(from)}_${slug(to)}`,
        lane: `${from} → ${to}`,
        ask,
        fair,
        watchers,
        confidence: Math.min(0.92, confidence),
      });
    }
  }
  return routes;
}

function mergeRoutes(base: RoutePricingSignal[], overrides: RoutePricingSignal[]) {
  if (!overrides.length) return base;
  const map = new Map(base.map((r) => [r.lane, r]));
  for (const route of overrides) {
    map.set(route.lane, { ...map.get(route.lane), ...route, id: route.id || map.get(route.lane)?.id || route.lane });
  }
  return Array.from(map.values());
}

function slug(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return h;
}
