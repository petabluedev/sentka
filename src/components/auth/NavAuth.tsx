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
          className="rounded-lg border border-slate-300 px-3 py-1 text-slate-800 hover:bg-slate-50"
        >
          Admin
        </a>
      ) : null}
      <a
        href="/profile"
        className="rounded-lg border border-slate-300 px-3 py-1 text-slate-800 hover:bg-slate-50"
        title={user.email}
      >
        {user.username || user.email} · {user.role.toUpperCase()}
      </a>
      <button
        onClick={logout}
        className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:border-slate-300 hover:text-slate-800"
      >
        Logout
      </button>
    </div>
  );
}
