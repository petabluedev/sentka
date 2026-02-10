"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type User = {
  email: string;
  username?: string;
  role: string;
};

type Props = { initialUser?: User | null };

export default function NavAuth({ initialUser = null }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(initialUser);

  // Always re-check auth on path change to sync logout/login across tabs/views.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!active) return;
        setUser(data?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.refresh();
    router.replace("/auth/signin");
  }

  if (!user) {
    return (
      <>
        <a href="/auth/signin" className="hover:text-slate-900">
          Sign in
        </a>
        <a
          href="/auth/register"
          className="rounded-lg border border-slate-300 px-3 py-1 text-slate-800 hover:bg-slate-50"
        >
          Create account
        </a>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user.role?.toUpperCase() === "ADMIN" ? (
        <a
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm hover:from-indigo-100 hover:to-sky-100"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold text-indigo-700 shadow-sm">
            A
          </span>
          Admin
        </a>
      ) : null}
      <a
        href="/profile"
        className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-emerald-50 px-3 py-1 text-slate-800 shadow-sm transition hover:border-slate-300 hover:to-emerald-100"
        title={user.email}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold shadow-sm">
          $
        </span>
        <span className="text-sm font-semibold">{user.username || user.email}</span>
        <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {user.role}
        </span>
      </a>
      <button
        onClick={logout}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-800"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 shadow-sm">
          ↗
        </span>
        Logout
      </button>
    </div>
  );
}
