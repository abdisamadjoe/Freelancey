import { getSession } from "@/lib/auth";
import { customPrimary, getOrgBranding } from "@/lib/org-branding";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

export default async function SetupLayout({ children }: { children: ReactNode }) {
  const [session, branding] = await Promise.all([getSession(), getOrgBranding()]);

  if (!session) redirect("/login");
  // Only owners should see the setup wizard
  if (session.member.role !== "owner") redirect("/dashboard");

  const primary = customPrimary(branding?.primaryColor);

  return (
    <div
      className="h-full overflow-y-auto bg-background-gray-secondary_alt_2"
      data-branded={primary ? "" : undefined}
      style={primary ? ({ "--primary": primary } as CSSProperties) : undefined}
    >
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">{children}</main>
    </div>
  );
}
