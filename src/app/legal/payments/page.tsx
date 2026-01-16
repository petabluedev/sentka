export const metadata = { title: "Payments • Sentka" };

export default function PaymentsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-4 text-sm text-slate-700">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payments</h1>
      <p>Sentka facilitates payments between shippers and carriers using regulated payment providers.</p>
      <p>Funds are held securely and released after proof-of-delivery (POD) approval. Sentka is not a bank or escrow agent.</p>
    </main>
  );
}
