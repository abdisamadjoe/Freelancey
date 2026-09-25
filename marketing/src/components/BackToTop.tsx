"use client";

import { useEffect, useState } from "react";

const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The captured markup (`.back-to-top`) sits off-screen by default
 * (`right: -50px` in styles/combined.css) and is meant to be slid into
 * view and have its progress ring animated by the theme's JS, which
 * SingleFile did not capture. This reimplements that behavior: visible
 * once the page is scrolled, with the ring reflecting scroll progress.
 */
export function BackToTop() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(pct);
      setVisible(scrollTop > 400);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="back-to-top right-aligned primary-color scroll-position-style"
      style={{ right: visible ? "30px" : "-50px", cursor: "pointer" }}
      role="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <span className="icon-arrow-up" />
      <svg height="50" width="50">
        <circle
          cx="25"
          cy="25"
          r={RADIUS}
          style={{
            strokeDasharray: `${CIRCUMFERENCE}px`,
            strokeDashoffset: `${CIRCUMFERENCE * (1 - progress)}px`,
          }}
        />
      </svg>
    </div>
  );
}
