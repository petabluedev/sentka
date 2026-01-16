// src/app/profile/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import LogoutButton from "@/components/auth/ProfileLogoutButton";

export const metadata = { title: "Profile • Sentka" };

export default async function ProfilePage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await getSession(token);
  if (!session?.user) redirect("/auth/signin");
  const user = session.user;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Account
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-slate-600">
          Manage your account details and sign-in info. This replaces the sign-in/create-account buttons when you are
          logged in.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Identity">
          <div className="space-y-2 text-sm text-slate-700">
            <Row label="Name" value={user.name || "—"} />
            <Row label="Email" value={user.email} />
            <Row label="Username" value={user.username} />
            <Row label="Role" value={user.role} />
          </div>
        </Card>

        <Card title="Security">
          <div className="space-y-2 text-sm text-slate-700">
            <Row
              label="Last login"
              value={user.lastLoginAt ? new Date(user.lastLoginAt as any).toLocaleString("en-US") : "—"}
            />
            <Row label="Sessions" value="Recent sessions active" />
          </div>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </Card>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
