// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-static";

export default function DashboardRedirect() {
  redirect("/shipper/dashboard");
}
