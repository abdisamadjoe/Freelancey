"use client";

import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  image?: string | null;
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Muted, template-friendly palette derived deterministically from the name. */
const AVATAR_COLORS = [
  "#5750f1",
  "#3758f9",
  "#0ea5e9",
  "#0e7490",
  "#16a34a",
  "#ca8a04",
  "#dc2626",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, image, size = 24, className = "" }: AvatarProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
  };

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        style={style}
        className={cn("shrink-0 rounded-full border-[0.5px] border-card-border object-cover", className)}
      />
    );
  }

  return (
    <span
      style={{ ...style, backgroundColor: colorFromName(name) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none",
        className,
      )}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping avatar row used in table cells and card headers. */
export function AvatarGroup({
  people,
  max = 3,
  size = 24,
}: {
  people: { name: string; image?: string | null }[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((person, index) => (
        <span
          key={`${person.name}-${index}`}
          className={cn("rounded-full ring-2 ring-card-background", index > 0 && "-ml-2")}
        >
          <Avatar name={person.name} image={person.image} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span
          className="-ml-2 inline-flex items-center justify-center rounded-full bg-background-gray-secondary text-xs font-medium text-text-secondary ring-2 ring-card-background"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
