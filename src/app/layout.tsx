// src/app/layout.tsx
import "@/app/styles.css";
import React from "react";
import { cookies } from "next/headers";
import NavAuth from "@/components/auth/NavAuth";
import { getSession, SESSION_COOKIE } from "@/lib/auth";

export const metadata = {
  title: "Sentka",
  description: "AI-powered auto transport",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await getSession(token) : null;
  const initialUser = session?.user
    ? { email: session.user.email, username: (session.user as any).username ?? "", role: session.user.role }
    : null;

  return (
    <html lang="en">
      <body className="bg-white text-slate-900">
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
              <a href="/about" className="hover:text-slate-900">About</a>
              <a href="/contact" className="hover:text-slate-900">Contact</a>
              <a href="/legal/privacy" className="hover:text-slate-900">Privacy</a>
              <a href="/legal/terms" className="hover:text-slate-900">Terms</a>
              <span className="mx-2 h-4 w-px bg-slate-200" aria-hidden="true" />
              <NavAuth initialUser={initialUser} />
            </nav>
          </div>
        </header>
        {children}
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
      </body>
    </html>
  );
}
