// src/app/admin/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminClientMarker from "@/components/admin/AdminClientMarker";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const metadata = { title: "Admin • Sentka" };

export default async function AdminPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/signin");
  }

  const [users, loads, payments] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, email: true, username: true, role: true, createdAt: true, lastLoginAt: true },
    }),
    prisma.load.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        pickupCity: true,
        dropoffCity: true,
        priceCents: true,
        vehicleType: true,
        createdAt: true,
        postedById: true,
      },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        loadId: true,
        payerId: true,
        payeeId: true,
        amountCents: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const roleCounts = users.reduce(
    (acc, u) => ({ ...acc, [u.role]: (acc as any)[u.role] + 1 || 1 }),
    { ADMIN: 0, SHIPPER: 0, DRIVER: 0 } as Record<string, number>
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <AdminClientMarker />
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Admin
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-sm text-slate-600">Overview of users, loads, and payments.</p>
        <div className="flex gap-3 text-sm text-slate-700">
          <Badge label="Admins" value={roleCounts.ADMIN || 0} color="emerald" />
          <Badge label="Shippers" value={roleCounts.SHIPPER || 0} color="sky" />
          <Badge label="Drivers" value={roleCounts.DRIVER || 0} color="amber" />
          <Badge label="Loads" value={loads.length} color="slate" />
          <Badge label="Payments" value={payments.length} color="violet" />
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Recent users">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-2">User</th>
                <th className="py-2">Role</th>
                <th className="py-2">Joined</th>
                <th className="py-2">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2">
                    <div className="font-semibold text-slate-900">{u.username || u.email}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-2 text-xs uppercase text-slate-700">{u.role}</td>
                  <td className="py-2 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="py-2 text-xs text-slate-500">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Recent loads">
          <div className="space-y-3">
            {loads.map((l) => (
              <div key={l.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">
                  {l.pickupCity} → {l.dropoffCity}
                </div>
                <div className="text-xs text-slate-600">
                  {l.vehicleType ?? "Vehicle"} · ${Math.round((l.priceCents ?? 0) / 100)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Posted {formatDate(l.createdAt)}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card title="Recent payments">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-2">Payment</th>
                <th className="py-2">Load</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 text-xs text-slate-700">{p.id.slice(0, 10)}…</td>
                  <td className="py-2 text-xs text-slate-700">{p.loadId}</td>
                  <td className="py-2 text-sm font-semibold text-slate-900">${(p.amountCents / 100).toFixed(0)}</td>
                  <td className="py-2 text-[11px] uppercase text-slate-700">{p.status}</td>
                  <td className="py-2 text-xs text-slate-500">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Badge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "sky" | "amber" | "slate" | "violet";
}) {
  const palette: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${palette[color]}`}>
      {label}: {value}
    </span>
  );
}

function formatDate(input?: Date | string | null) {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString();
}
