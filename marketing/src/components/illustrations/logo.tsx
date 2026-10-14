import Image from "next/image";

/** Official Freelancey logo (symbol and wordmark). */
export function BrandLogo() {
  return <Image src="/images/logo.svg" alt="Freelancey" width={587} height={128} priority className="h-10 w-auto" />;
}
