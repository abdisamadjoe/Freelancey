import { cn } from "@/lib/cn";

/** Small "brand" badge above section titles: tinted icon tile + white label pill. */
export function SectionBadge({
  icon,
  children,
  dark,
  className,
  pillClassName,
}: {
  icon: React.ReactNode;
  pillClassName?: string;
  children: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      <span className="block h-7 w-7 shrink-0">{icon}</span>
      <span
        className={cn(
          "t-geist-13 rounded-[8px] px-[6px] py-[3px]",
          dark ? "bg-[#18191b] text-white" : "bg-white text-ink",
          pillClassName,
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function SectionTitle({
  badge,
  title,
  text,
  dark,
  className,
}: {
  badge: React.ReactNode;
  title: string;
  text?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 text-center", className)}>
      {badge}
      <h2 className={cn("t-h2", dark ? "text-white" : "text-ink")}>{title}</h2>
      {text ? <p className={cn("t-body", dark ? "text-white/80" : "text-body")}>{text}</p> : null}
    </div>
  );
}
