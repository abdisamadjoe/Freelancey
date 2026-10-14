import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="flex h-10 w-full items-center gap-2">
      <Image src="/images/logo-symbol.svg" alt="" width={40} height={40} priority />
      <span className="font-[family-name:var(--font-geist)] text-[24px] font-semibold tracking-[-0.9px] text-ink">
        Freelancey
      </span>
    </span>
  );
}
