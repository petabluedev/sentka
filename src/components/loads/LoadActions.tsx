"use client";

import { useState } from "react";

type Props = {
  loadId: string;
  paymentId?: string | null;
  captured?: boolean | null;
  epodApproved?: boolean;
  epodSignature?: string | null;
  epodRequestedAt?: string | null;
  pickupHandoffAt?: string | null;
  pickupHandoffSignature?: string | null;
  hasAcceptedBid?: boolean;
};

export default function LoadActions({
  loadId,
  paymentId,
  captured,
  epodApproved,
  epodSignature,
  epodRequestedAt,
  pickupHandoffAt,
  pickupHandoffSignature,
  hasAcceptedBid,
}: Props) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { stage: "PICKUP" | "EPOD"; title: string }>(null);
  const [signature, setSignature] = useState("");

  const pickupSigned = Boolean(pickupHandoffAt);
  const epodSigned = Boolean(epodApproved);

  async function submitSignature(stage: "PICKUP" | "EPOD") {
    setWorking(true);
    setError(null);
    const endpoint = stage === "PICKUP" ? `/api/loads/${loadId}/handoff` : `/api/loads/${loadId}/epod`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ signature }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      setError(j.error || "Failed to save signature");
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
      {hasAcceptedBid && !pickupSigned ? (
        <button
          onClick={() => {
            setSignature("");
            setModal({ stage: "PICKUP", title: "Pickup handoff signature" });
          }}
          disabled={working}
          className="rounded border border-slate-300 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Sign pickup handoff
        </button>
      ) : null}
      {pickupSigned ? (
        <span className="text-emerald-700 font-semibold">
          Pickup signed{pickupHandoffSignature ? ` • ${pickupHandoffSignature}` : ""}
        </span>
      ) : null}
      {epodRequestedAt && !epodSigned ? (
        <button
          onClick={() => {
            setSignature("");
            setModal({ stage: "EPOD", title: "Delivery (ePOD) signature" });
          }}
          disabled={working}
          className="rounded border border-slate-300 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Sign ePOD
        </button>
      ) : null}
      {epodRequestedAt && !epodSigned ? (
        <span className="text-amber-700 font-semibold">Awaiting shipper signature</span>
      ) : null}
      {epodSigned ? (
        <span className="text-emerald-700 font-semibold">
          ePOD signed{epodSignature ? ` • ${epodSignature}` : ""}
        </span>
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

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="text-sm font-semibold text-slate-900">{modal.title}</div>
            <p className="mt-1 text-xs text-slate-500">Type your name to sign and authorize the handoff.</p>
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Signature (full name)"
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submitSignature(modal.stage)}
                disabled={working || !signature.trim()}
                className="rounded-lg bg-black px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {working ? "Saving…" : "Sign & confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
