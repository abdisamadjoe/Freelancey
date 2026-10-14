"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavLink } from "@/lib/site";

export function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tab:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0b0c2b" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
        </svg>
      </button>
      {open && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-2 flex flex-col gap-4 rounded-[16px] bg-white p-5 shadow-[0_15px_20px_-5px_rgba(0,0,0,0.12)]">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={() => setOpen(false)} className="t-14-md block text-ink transition-colors hover:text-primary">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
