// src/components/bids/BookDriver.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

export default function BookDriver({ load }: { load: any }) {
  const [open, setOpen] = useState(false);
  const [livePrice, setLivePrice] = useState<number>(Math.max(350, (load.priceCents ?? 60000) / 100));
  const rafRef = useRef<number | null>(null);

  // playful live price animation (+/- few dollars)
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      setLivePrice((p) => {
        const drift = (Math.random() - 0.5) * 6; // -3 to +3
        const next = Math.max(250, Math.min(2000, p + drift));
        return Math.round(next * 100) / 100;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open]);

  async function bookNow() {
    const res = await fetch(apiUrl("/api/bids/quote"), {
      method: "POST",
      body: JSON.stringify({ loadId: load.id, offer: Math.round(livePrice * 100) }),
    }).catch(() => undefined);

    if (res?.ok) {
      alert("Driver booked! (stub)");
      setOpen(false);
    } else {
      alert("Failed to book (stub).");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-black px-3 py-1.5 text-white hover:bg-slate-900"
      >
        Book Driver
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">Instant offer for</div>
                <div className="text-lg font-semibold">
                  {load.pickupCity} → {load.dropoffCity}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {load.vehicleType}{load.enclosed ? " · Enclosed" : ""} · {load.vehicle ?? "—"}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <OfferCard title="Live price" value={`$${livePrice.toFixed(0)}`} pulse />
              <OfferCard title="Projected net (after fees)" value={`$${Math.max(0, livePrice - 25).toFixed(0)}`} />
              <OfferCard title="ETA pickup window" value="Today 2–5pm" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <input className="rounded-lg border px-3 py-2" placeholder="Driver notes (optional)" />
              <input className="rounded-lg border px-3 py-2" placeholder="PO / Ref (optional)" />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setOpen(false)} className="rounded-lg border px-3 py-2 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={bookNow} className="rounded-lg bg-black px-4 py-2 text-white hover:bg-slate-900">
                Book now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OfferCard({ title, value, pulse }: { title: string; value: string; pulse?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${pulse ? "animate-[pulse_1.8s_ease-in-out_infinite]" : ""}`}>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-0.5 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
