"use client";

import { useRouter } from "next/navigation";

export default function ProfileLogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/auth/signin");
  }
  return (
    <button
      onClick={logout}
      className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50"
    >
      Logout
    </button>
  );
}
