import { redirect } from "next/navigation";
import { DEFAULT_BRANDING } from "@/shared";
import { getSession } from "@/lib/auth";
import { serverApiFetch } from "@/lib/server-api";

async function getBranding(): Promise<{
  primaryColor?: string;
  accentColor?: string;
} | null> {
  return serverApiFetch("/branding");
}

/**
 * Setup wizard shell — same guards and branding CSS variables as before, but
 * rendered on the template's app background (`bg-background-gray-secondary_alt_2`)
 * with a centred content column, matching the NextAdmin page surface.
 */
export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, branding] = await Promise.all([getSession(), getBranding()]);

  if (!session) {
    redirect("/login");
  }

  // Only owners should see the setup wizard
  if (session.member.role !== "owner") {
    redirect("/dashboard");
  }

  return (
    <div
      className="min-h-screen bg-background-gray-secondary_alt_2"
      style={
        {
          "--primary": branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
          "--accent": branding?.accentColor || DEFAULT_BRANDING.accentColor,
        } as React.CSSProperties
      }
    >
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
        {children}
      </main>
    </div>
  );
}
