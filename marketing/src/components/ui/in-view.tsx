"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** "block" fades the whole block up, "words" reveals a text word by word. */
  mode?: "block" | "words" | "scale";
  as?: "div" | "section" | "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
};

export function InView({ children, className, mode = "block", as = "div", delay = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-in", "");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-in", "");
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(mode === "words" ? "reveal-words" : mode === "scale" ? "reveal-scale" : "reveal", className)}
    >
      {children}
    </Tag>
  );
}

/** Splits a string into words so the global .reveal-words rules can stagger them. */
export function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i, a) => (
        <span key={i}>
          <span className="word" style={{ ["--i" as string]: i }}>
            {w}
          </span>
          {i < a.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
