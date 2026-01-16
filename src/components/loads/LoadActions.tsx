"use client";

import { useState } from "react";

type Props = {
  loadId: string;
  paymentId?: string | null;
  captured?: boolean | null;
  epodApproved?: boolean;
};

export default function LoadActions({ loadId, paymentId, captured, epodApproved }: Props) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approveEPOD() {
    setWorking(true);
    setError(null);
    const res = await fetch(`/api/loads/${loadId}/epod`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      setError(j.error || "Failed to approve ePOD");
      setWorking(false);
      return;
    }
    window.location.reload();
  }

  async function releaseFunds() {
    if (!paymentId) return;
    setWorking(true);
    setError(null);
    const res = await fetch("/api/payments/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ paymentId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      setError(j.error || "Failed to release funds");
      setWorking(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {!epodApproved ? (
        <button
          onClick={approveEPOD}
          disabled={working}
          className="rounded border border-slate-300 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {working ? "Saving…" : "Approve ePOD"}
        </button>
      ) : null}
      {epodApproved && paymentId && !captured ? (
        <button
          onClick={releaseFunds}
          disabled={working}
          className="rounded bg-black px-3 py-1 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {working ? "Releasing…" : "Release funds"}
        </button>
      ) : null}
      {captured ? <span className="text-emerald-700 font-semibold">Paid out</span> : null}
      {error ? <span className="text-red-600">{error}</span> : null}
    </div>
  );
}
