"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function AppFooter() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (pathname?.startsWith("/auth")) return null;

  return (
    <footer className="border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-slate-500 flex flex-wrap gap-4 items-center justify-between">
        <span>© {new Date().getFullYear()} Sentka, Inc.</span>
        <div className="flex flex-wrap gap-4">
          <a className="hover:text-slate-700" href="/about">About</a>
          <a className="hover:text-slate-700" href="/contact">Contact</a>
          <a className="hover:text-slate-700" href="/legal/privacy">Privacy Policy</a>
          <a className="hover:text-slate-700" href="/legal/terms">Terms of Service</a>
          <a className="hover:text-slate-700" href="/legal/payments">Payments</a>
        </div>
      </div>
    </footer>
  );
}
