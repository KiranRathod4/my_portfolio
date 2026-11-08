"use client";

import { useEffect, useRef, useState } from "react";
import "./SectionTitle.css";

/**
 * Shared section heading, in the same clean style as the Experience heading:
 * a small label, one big line (white + lime) and an optional sentence.
 * It eases in (fade, rise, un-blur) the first time it scrolls into view.
 */
export function SectionTitle({
  kicker, white, lime, sub, align = "center", className = "",
}: {
  kicker: string;
  white: string;
  lime: string;
  sub?: string;
  align?: "center" | "left";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <header ref={ref} className={`st st-${align} ${seen ? "st-in" : ""} ${className}`}>
      <p className="st-kicker">{kicker}</p>
      <h2 className="st-title"><span>{white}</span> <em>{lime}</em></h2>
      {sub && <p className="st-sub">{sub}</p>}
    </header>
  );
}
