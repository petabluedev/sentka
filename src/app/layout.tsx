// src/app/layout.tsx
import "@/app/styles.css";
import React from "react";
import { cookies } from "next/headers";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
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
        <AppFooter />
      </body>
    </html>
  );
}
