"use client";

import { useEffect, useRef, useState } from "react";

export default function LiveBidCard({
  title,
  base = 700,
  spread = 60,
  intervalMs = 1800,
}: {
  title: string;
  base?: number;
  spread?: number;
  intervalMs?: number;
}) {
  // Stable server+client initial render to avoid hydration mismatch
  const [price, setPrice] = useState<number>(base);
  const prev = useRef(price);

  // After mount, start animating
  useEffect(() => {
    // first tick after mount
    setPrice(jitter(base, spread));
    const id = setInterval(() => setPrice(jitter(base, spread)), intervalMs);
    return () => clearInterval(id);
  }, [base, spread, intervalMs]);

  const direction: "up" | "down" | "flat" =
    price > prev.current ? "up" : price < prev.current ? "down" : "flat";
  prev.current = price;

  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-gray-500">instant book eligible</div>
      </div>

      <div className="text-right" /* optional: suppressHydrationWarning */>
        <div
          className={`text-lg font-semibold transition-colors duration-300 ${
            direction === "up"
              ? "text-emerald-600"
              : direction === "down"
              ? "text-rose-600"
              : "text-gray-900"
          }`}
        >
          ${price.toFixed(0)}
        </div>
        <Pulse direction={direction} />
      </div>
    </div>
  );
}

function Pulse({ direction }: { direction: "up" | "down" | "flat" }) {
  const color =
    direction === "up" ? "bg-emerald-200" : direction === "down" ? "bg-rose-200" : "bg-gray-200";
  return (
    <div
      className={`mt-1 h-1 w-14 overflow-hidden rounded-full ${color}`}
      style={{ boxShadow: "0 0 0 2px rgba(0,0,0,0.02) inset" }}
    >
      <div className="h-full w-full animate-[pulse_1.2s_ease-in-out_infinite]" />
    </div>
  );
}

function jitter(base: number, spread: number) {
  const delta = (Math.random() * 2 - 1) * spread;
  return Math.max(200, base + delta);
}
