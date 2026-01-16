export const metadata = { title: "Contact • Sentka" };

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          Contact
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Talk to Sentka</h1>
        <p className="text-sm text-slate-600">Reach out for shipper onboarding, driver questions, or partnerships.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 text-sm text-slate-700">
        <div><span className="font-semibold">Email:</span> support@sentka.com</div>
        <div><span className="font-semibold">Sales:</span> sales@sentka.com</div>
        <div><span className="font-semibold">Support hours:</span> Mon–Fri 9am–6pm CT</div>
      </section>
    </main>
  );
}
