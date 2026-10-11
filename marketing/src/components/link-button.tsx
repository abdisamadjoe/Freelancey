import Link from "next/link";
import type { ComponentProps } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-4 focus-visible:ring-brand-200";

const variants = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  outline: "border border-line bg-surface text-ink hover:bg-surface-muted",
  inverse: "bg-white text-brand-700 hover:bg-brand-50",
  "inverse-outline": "border border-white/40 text-white hover:bg-white/10",
} as const;

const sizes = {
  md: "h-10 px-4",
  lg: "h-12 px-6 text-base",
} as const;

type Props = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

/** One button for the whole site. Links to the app are plain anchors; links on this site use next/link. */
export function LinkButton({ href, variant = "primary", size = "md", className = "", children, ...props }: Props) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
