import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

/** Workspace owners and admins only; client members live in the portal. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session?.member.role === "member") {
    redirect("/portal");
  }
  return <>{children}</>;
}
