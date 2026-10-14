"use client";

import { useEffect, useRef } from "react";

/**
 * Hero dashboard frame. Like the source, it starts tilted back and settles flat
 * as the page scrolls (rotateX 20deg -> 0, scale 0.8 -> 1, translateY -80px -> 0).
 * Measured from the original: progress is ~0.47 at scrollY 0 and reaches 1 at ~346px.
 */
export function HeroShowcase({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const p = reduce ? 1 : Math.min(1, Math.max(0, (window.scrollY + 307) / 653));
      const r = 1 - p;
      el.style.transform = `perspective(1200px) translateY(${-80 * r}px) scale(${0.8 + 0.2 * p}) rotateX(${20 * r}deg)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ transform: "perspective(1200px) translateY(-42px) scale(0.894) rotateX(10.57deg)", willChange: "transform" }}>
      {children}
    </div>
  );
}
