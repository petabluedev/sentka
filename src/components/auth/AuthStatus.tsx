// Lightweight client badge to show current signed-in user info.
"use client";

import { useEffect, useState } from "react";

type User = { email: string; name?: string | null; role: string; username?: string };
type Props = { initialUser?: User | null };

export default function AuthStatus({ initialUser = null }: Props) {
  const [user, setUser] = useState<User | null>(initialUser);

  useEffect(() => {
    if (initialUser) return;
    let mounted = true;
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (mounted && data?.user) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [initialUser]);

  if (!user) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      Signed in as <span className="font-semibold text-slate-900">{user.username || user.email}</span> ·{" "}
      <span className="uppercase tracking-wide">{user.role}</span>
    </div>
  );
}
