import Image from "next/image";

/** Official Gigly logo (symbol and wordmark). */
export function BrandLogo() {
  return <Image src="/images/logo.svg" alt="Gigly" width={587} height={128} priority className="h-10 w-auto" />;
}
