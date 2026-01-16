// src/app/pricing/page.tsx
import LiveRibbon from "@/components/pricing/LiveRibbon";
import LiveBidsPanel from "@/components/pricing/LiveBidsPanel";
import LiveBidCard from "@/components/bids/LiveBidCard";

export const metadata = { title: "Pricing • Sentka" };

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          Live intelligent pricing
        </div>
        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Pricing that adapts in real time.</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Sentka models lane demand, equipment, and seasonality to surface a fair ask price. Carriers can
              instant-book or counter — the ribbon and bid panels below stay in sync between SSR and CSR.
            </p>
            <p className="max-w-2xl text-xs text-slate-500">
              Prices reflect live lane demand and carrier availability. Final payout is shown before booking.
            </p>
            <div className="flex flex-wrap gap-3 text-[13px] text-slate-700">
              <Badge>Instant book</Badge>
              <Badge>Confidence scoring</Badge>
              <Badge>Model vs ask delta</Badge>
              <Badge>Watcher counts</Badge>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-md">
            <div className="text-xs uppercase tracking-wide text-emerald-700">SLA</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">Sub-10s repricing</div>
            <div className="text-xs text-slate-500">per lane refresh target</div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <LiveRibbon />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <LiveBidsPanel />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <LiveBidCard title="Dallas → Atlanta · SUV" base={720} spread={42} />
          <LiveBidCard title="Austin → Denver · Sedan" base={650} spread={36} />
          <LiveBidCard title="Houston → Miami · Enclosed" base={980} spread={54} />
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Lane awareness"
            body="We tune for weather, dwell time, and event spikes. Confidence moves with watcher count and bid density."
          />
          <FeatureCard
            title="Transparent deltas"
            body="See how far the ask is from model. Bidders know when they're under/over model, reducing back-and-forth."
          />
          <FeatureCard
            title="Instant-book rules"
            body="Cap exposure with ceilings, floor pricing, and enclosed-only filters per lane or per customer."
          />
        </section>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{children}</span>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
