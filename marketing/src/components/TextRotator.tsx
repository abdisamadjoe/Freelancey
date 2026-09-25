"use client";

import { useEffect, useState } from "react";

/**
 * Reimplementation of the Elementor "keydesign-text-rotator" widget.
 * The original relies on the theme's JS (not captured by SingleFile) to
 * cycle the `.is-active` class among `.kd-text-rotator__item` spans every
 * few seconds; the CSS driving the zoom transition (`.kd-rotator--zoom`)
 * is preserved as-is in styles/combined.css, so we only need to toggle
 * the same class names on an interval to match the original animation.
 */
export function TextRotator({
  prefix,
  words,
  intervalMs = 2200,
}: {
  prefix: string;
  words: string[];
  intervalMs?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <div className="kd-text-rotator kd-rotator--zoom" data-animation-delay="0">
      <h1 className="kd-text-rotator__title">
        <span className="kd-text-rotator__prefix">{prefix}</span>{" "}
        <span aria-live="polite" className="kd-text-rotator__items">
          {words.map((word, i) => (
            <span
              key={word}
              className={`kd-text-rotator__item ${
                i === activeIndex ? "is-active" : "is-hidden"
              }`}
            >
              {word}
            </span>
          ))}
        </span>
      </h1>
    </div>
  );
}
