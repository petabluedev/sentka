// src/app/layout.tsx
import "@/app/styles.css";
import React from "react";
import { cookies } from "next/headers";
import AppHeader from "@/components/layout/AppHeader";
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
        <AppHeader initialUser={initialUser} />
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
