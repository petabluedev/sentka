// src/app/auth/signin/SignInClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInClient() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: login, username: login, password, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        setLoading(false);
        return;
      }
      const role = (data.user?.role ?? "").toString().toUpperCase();
      const destination =
        role === "DRIVER" ? "/driver/dashboard" : role === "ADMIN" ? "/admin" : "/shipper/dashboard";
      router.replace(destination);
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-2xl space-y-10 rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-[2.2rem] font-semibold text-slate-900 leading-tight">Welcome back</h1>
          <p className="text-lg text-slate-600">Sign in to manage loads and bids.</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-700">Email or username</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-3.5 text-base focus:border-slate-400 focus:outline-none"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="you@example.com or username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-3.5 text-base focus:border-slate-400 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Remember me
            </label>
            <a href="#" className="text-emerald-700 hover:text-emerald-800">Forgot password?</a>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3.5 text-base font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="text-center text-sm text-slate-600">
          New to Sentka?{" "}
          <a href="/auth/register" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Create an account
          </a>
        </div>
      </div>
    </main>
  );
}
