// src/app/auth/register/RegisterClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"shipper" | "driver">("shipper");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setSuggestions(makeSuggestions(name, email));
  }, [name, email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      alert("Passwords must match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, username: username || suggestions[0] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }
      const destination = role === "driver" ? "/driver/dashboard" : "/shipper/dashboard";
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
          <h1 className="text-[2.2rem] font-semibold text-slate-900 leading-tight">Create your account</h1>
          <p className="text-lg text-slate-600">Pick a role to tailor your workspace.</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-700">Name</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-3.5 text-base focus:border-slate-400 focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
            />
          </div>
          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-3.5 text-base focus:border-slate-400 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-700">Role</label>
            <div className="flex gap-2">
              <RolePill label="Shipper" value="shipper" active={role === "shipper"} onClick={() => setRole("shipper")} />
              <RolePill label="Driver" value="driver" active={role === "driver"} onClick={() => setRole("driver")} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-700 flex items-center gap-2">
              Username <span className="text-xs font-normal text-slate-500">unique</span>
            </label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-3.5 text-base focus:border-slate-400 focus:outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={suggestions[0] || "your-handle"}
            />
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setUsername(s)}
                  className={`rounded-full border px-3 py-1 ${
                    username === s ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
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
          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-700">Confirm password</label>
            <input
              type="password"
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-3.5 text-base focus:border-slate-400 focus:outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3.5 text-base font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <a href="/auth/signin" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Sign in
          </a>
        </div>
      </div>
    </main>
  );
}

function RolePill({ label, value, active, onClick }: { label: string; value: "shipper" | "driver"; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-4 py-3.5 text-base font-semibold transition ${
        active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function makeSuggestions(name: string, email: string) {
  const base =
    slugify(name) ||
    slugify(email.split("@")[0] || "") ||
    `sentka${Math.floor(Math.random() * 900 + 100)}`;
  const alt1 = `${base}${Math.floor(Math.random() * 90 + 10)}`;
  const alt2 = `${base}_${Math.floor(Math.random() * 900 + 100)}`;
  return Array.from(new Set([base, alt1, alt2])).slice(0, 3);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}
