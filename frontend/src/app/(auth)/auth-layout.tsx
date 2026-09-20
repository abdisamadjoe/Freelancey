import Image from "next/image";
import { Card } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Split-screen authentication shell, composed to the NextAdmin auth layout:
 * a brand-token illustration panel on the left (lg and up) and a centred
 * white form Card on the app background on the right.
 *
 * `wide` keeps the plan-selection width used by /signup.
 */
export function AuthLayout({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background-gray-secondary_alt_2">
      {/* Brand panel */}
      <div className="relative hidden shrink-0 flex-col items-center justify-center gap-8 overflow-hidden bg-brand-500 p-12 lg:flex lg:w-1/2">
        <Image
          src="/illustrations/contract.svg"
          alt=""
          width={604}
          height={800}
          className="pointer-events-none relative h-auto max-h-[47vh] w-auto object-contain"
          priority
        />
        <p className="relative z-10 max-w-xs text-center text-sm leading-5 text-white">
          Share progress, files, and sign-offs with your clients in one place.
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center overflow-y-auto p-4 sm:p-8 lg:p-10 xl:p-12">
        <ThemeToggle className="absolute top-4 right-4" />
        <div className={`w-full ${wide ? "max-w-3xl" : "max-w-sm"}`}>
          <div className="mb-6 flex justify-center">
            <Image
              src="/logo/freelancey.svg"
              alt="Freelancey"
              width={182}
              height={40}
              className="h-[31px] w-auto"
              priority
            />
          </div>

          <Card className="p-6 sm:p-7">{children}</Card>
        </div>
      </div>
    </div>
  );
}
