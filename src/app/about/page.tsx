export const metadata = { title: "About • Sentka" };

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          About Sentka
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Built for transparent auto logistics</h1>
        <p className="text-sm text-slate-600">
          Sentka connects shippers and carriers through transparent pricing, live bidding, and delivery-verified payouts.
          We’re focused on speed, trust, and reducing back-and-forth.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Founder</h2>
        <p className="text-sm text-slate-700">
          <span className="font-semibold">Babatunde Oni</span> – Founder & Lead Developer. Babatunde leads product and engineering,
          ensuring the platform stays fast, transparent, and reliable for both shippers and drivers.
        </p>
      </section>
    </main>
  );
}
