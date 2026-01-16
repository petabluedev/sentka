export const metadata = { title: "Terms of Service • Sentka" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-4 text-sm text-slate-700">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
      <p>Sentka provides a platform for shippers and carriers to post, bid, and manage auto transport loads.</p>
      <p>By using Sentka you agree to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Provide accurate load and payment information.</li>
        <li>Comply with applicable transport and marketplace laws.</li>
        <li>Use payments only through supported providers.</li>
      </ul>
      <p>Sentka may update these terms; continued use means acceptance of any changes.</p>
    </main>
  );
}
