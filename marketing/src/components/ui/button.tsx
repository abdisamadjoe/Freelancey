import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "light" | "dark" | "outline";
type Size = "sm" | "md";

const base =
  "group relative inline-flex items-center justify-center gap-[10px] rounded-[12px] after:pointer-events-none after:absolute after:inset-0 after:rounded-[12px] after:content-['']";

const variants: Record<Variant, string> = {
  primary: "bg-[linear-gradient(#0B6B52,#064E3B)] text-white",
  light: "bg-white text-ink after:border after:border-[rgba(6, 78, 59,0.2)]",
  dark: "bg-[linear-gradient(#0B6B52,#032A20)] text-white after:border after:border-ink",
  outline: "bg-white text-ink after:border after:border-black/10",
};

const sizes: Record<Size, string> = {
  sm: "px-[15px] py-[11px] gap-[6px] t-15-md",
  md: "px-[22px] py-3 t-body-sb",
};

type Props = {
  href: string;
  children: string;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

/** Text rolls up on hover: two stacked copies inside an overflow-hidden box. */
export function Button({ href, children, variant = "primary", size = "md", icon, className, onClick }: Props) {
  const lh = size === "sm" ? "h-[24px]" : "h-[27.2px]";
  return (
    <Link href={href} onClick={onClick} className={cn(base, variants[variant], sizes[size], className)}>
      <span className={cn("relative flex flex-col overflow-hidden", lh)}>
        <span className={cn("block whitespace-nowrap transition-transform duration-300 ease-out group-hover:-translate-y-full", lh)}>
          {children}
        </span>
        <span
          aria-hidden
          className={cn("block whitespace-nowrap transition-transform duration-300 ease-out group-hover:-translate-y-full", lh)}
        >
          {children}
        </span>
      </span>
      {icon}
    </Link>
  );
}
