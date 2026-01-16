// src/app/docs/page.tsx

export const metadata = { title: "Docs • Sentka" };

const endpoints = [
  { method: "GET", path: "/api/loads", desc: "List recent loads (max 100)", auth: "public demo" },
  { method: "POST", path: "/api/loads", desc: "Create a load with pickup/dropoff/price", auth: "public demo" },
  { method: "POST", path: "/api/bids/quote", desc: "Request a pricing quote for a lane", auth: "public demo" },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-10">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          Sentka API
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Docs</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Simple JSON endpoints for quoting lanes and posting loads. Responses are designed to be hydration-friendly
          so SSR and CSR render the same payload shape.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Endpoints</h2>
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {endpoints.map((ep) => (
            <div key={ep.path} className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">{ep.method}</span>
                <span className="font-mono text-xs text-slate-900">{ep.path}</span>
              </div>
              <div className="text-xs text-slate-600">{ep.desc} · <em>{ep.auth}</em></div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DocCard
          title="Quote a lane"
          body="POST origin/destination with vehicle details to get a modeled ask price plus instant-book eligibility."
          code={`curl -X POST /api/bids/quote \\
  -H "Content-Type: application/json" \\
  -d '{ "from": "Dallas, TX", "to": "Atlanta, GA", "vehicleType": "SUV", "enclosed": false }'`}
        />
        <DocCard
          title="Create a load"
          body="Minimum payload: pickupCity, dropoffCity, price or priceCents. Optional: vehicleType, enclosed, distance."
          code={`fetch("/api/loads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pickupCity: "Plano, TX",
    dropoffCity: "Austin, TX",
    price: 620,
    vehicleType: "SUV",
    enclosed: false
  })
});`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DocCard
          title="Webhook shape"
          body="All webhooks include idempotency keys and signature headers. Retry with exponential backoff for non-2xx responses."
          code={`{
  "id": "bid_123",
  "type": "bid.created",
  "createdAt": "2024-09-09T12:32:11Z",
  "data": {
    "loadId": "load_456",
    "amount": 72500,
    "source": "instant_book"
  }
}`}
        />
        <DocCard
          title="Error contract"
          body="Errors are JSON with { error, code }. Always treat 4xx as final and 5xx as retryable."
          code={`{
  "error": "Missing: pickupCity, price",
  "code": "VALIDATION"
}`}
        />
      </section>
    </main>
  );
}

function DocCard({ title, body, code }: { title: string; body: string; code: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-600">{body}</p>
      </div>
      <pre className="overflow-x-auto bg-slate-900 px-4 py-3 text-xs text-slate-100">
{code}
      </pre>
    </div>
  );
}
