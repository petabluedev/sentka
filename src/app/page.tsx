import LiveRibbon from "@/components/pricing/LiveRibbon";
import LiveBidCard from "@/components/bids/LiveBidCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-50 via-sky-50 to-white" />
        <div className="mx-auto max-w-7xl px-8 pb-24 pt-20 relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            Live intelligent pricing
          </div>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-start">
            <div className="space-y-6">
              <h1 className="text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                Move freight faster with adaptive pricing and instant bids.
                <span className="block text-2xl mt-2 text-slate-800">Verified carriers. POD-based payouts. No spreadsheets.</span>
              </h1>
              <p className="max-w-2xl text-lg text-slate-600">
                Sentka connects shippers and carriers with fair-market pricing, live counters, and POD-based payouts.
                No spreadsheets—just a clean workspace that stays in sync server and client side.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                <TrustBadge>🔒 Secure payments</TrustBadge>
                <TrustBadge>🧾 POD-based payouts</TrustBadge>
                <TrustBadge>⚖️ Marketplace-compliant settlement</TrustBadge>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                <Badge>Instant-book rules</Badge>
                <Badge>Confidence scoring</Badge>
                <Badge>Lane-aware models</Badge>
                <Badge>POD payouts</Badge>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="/shipper/dashboard" className="rounded-lg bg-black px-6 py-3 text-white text-sm font-semibold shadow-sm">
                  Open Shipper Dashboard
                </a>
                <a href="/driver/dashboard" className="rounded-lg border border-slate-300 px-6 py-3 text-slate-800 text-sm font-semibold">
                  Driver view
                </a>
                <a href="/pricing" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                  See pricing →
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Avg. repricing" value="<10s" hint="per lane refresh" />
                <Stat label="Live bids" value="9–14" hint="per posted load" />
                <Stat label="On-time" value="98%" hint="recent carrier SLA" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-emerald-700">Dallas → Atlanta · SUV</div>
                <div className="mt-2">
                  <LiveRibbon />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <LiveBidCard title="Austin → Denver · Sedan" base={650} spread={36} />
                <LiveBidCard title="Houston → Miami · Enclosed" base={980} spread={54} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-8 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            title="Price with confidence"
            body="Modelled ask vs fair price with watcher counts and confidence so you know when to instant-book."
          />
          <Feature
            title="Bids that stay live"
            body="Counters stream in; SSR and CSR render match to avoid hydration surprises in your workspace."
          />
          <Feature
            title="Payouts on POD"
            body="Paperwork tracked, POD triggers payout so drivers get paid promptly after delivery."
          />
        </div>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">{children}</span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-500">{hint}</div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function TrustBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-emerald-50 px-3 py-1">
      {children}
    </span>
  );
}
