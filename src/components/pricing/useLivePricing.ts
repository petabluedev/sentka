"use client";

import { useEffect, useState } from "react";
import type { PricingSignal } from "./types";

export default function useLivePricing(initialAsk = 720): PricingSignal {
  const [ask, setAsk] = useState(initialAsk);
  const [fair, setFair] = useState(700);
  const [prev, setPrev] = useState(initialAsk);
  const [watchers, setWatchers] = useState(14);
  const [bids, setBids] = useState(8);

  useEffect(() => {
    const id = setInterval(() => {
      setAsk((currentAsk) => {
        const nextAsk = Math.round(currentAsk + (Math.random() - 0.5) * 12);
        setPrev(currentAsk);
        return nextAsk;
      });
      setFair((p) => Math.round(p + (Math.random() - 0.5) * 6));
      setWatchers((w) => Math.max(6, Math.min(24, w + Math.round((Math.random() - 0.5) * 2))));
      setBids((b) => Math.max(4, Math.min(14, b + Math.round((Math.random() - 0.5) * 2))));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const delta = ask - prev;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return {
    fairPrice: fair,
    askPrice: ask,
    changeAbs: delta,
    changePct: Math.abs(delta),
    trend,
    watchers,
    bids,
    confidence: 0.78
  };
}
