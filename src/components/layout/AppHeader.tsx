"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavAuth from "@/components/auth/NavAuth";

type User = {
  email: string;
  username?: string;
  role: string;
};

type Props = { initialUser?: User | null };

export default function AppHeader({ initialUser = null }: Props) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (pathname?.startsWith("/auth")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-black text-white">S</div>
          <span className="text-sm font-semibold">Sentka</span>
        </div>
        <nav className="hidden items-center gap-4 text-sm text-slate-700 md:flex">
          <a href="/" className="hover:text-slate-900">Home</a>
          <a href="/shipper/dashboard" className="hover:text-slate-900">Dashboard</a>
          <a href="/pricing" className="hover:text-slate-900">Pricing</a>
          <a href="/docs" className="hover:text-slate-900">Docs</a>
          <span className="mx-2 h-4 w-px bg-slate-200" aria-hidden="true" />
          <NavAuth initialUser={initialUser} />
        </nav>
      </div>
    </header>
  );
}
