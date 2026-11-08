"use client";

import { useEffect, useRef } from "react";

/**
 * Neon comet trail that follows the pointer, in the site's lime/green theme:
 * a tapering ribbon made of a few parallel strands that fan out toward the tail,
 * a white-lime core fading through lime to green/teal, and a swirling bright head.
 * - additive blending on a fixed full-screen canvas, never blocks clicks
 * - the trail shortens and the head settles into a soft pulse when the pointer rests
 * - disabled on touch screens and with prefers-reduced-motion
 */

type Pt = { x: number; y: number; t: number };

const LIFE = 0.9;       // seconds a point of the trail stays visible
const STRANDS = [-1, 0, 1];

// colour along the ribbon from head (0) to tail (1): [r, g, b]
const STOPS: [number, number, number][] = [
  [240, 255, 190], // white-lime core
  [190, 245, 70],  // lime
  [60, 205, 100],  // green
  [20, 130, 120],  // teal
];
function colourAt(t: number): [number, number, number] {
  const f = Math.min(0.999, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.floor(f), k = f - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export default function FlameCursor() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now(), time = 0;
    const target = { x: -999, y: -999 };
    const head = { x: -999, y: -999 };
    let seen = false;
    let speed = 0;
    const pts: Pt[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      if (!seen) return;

      // the head glides toward the pointer, so fast moves leave a long streak behind it
      const px = head.x, py = head.y;
      head.x += (target.x - head.x) * Math.min(1, dt * 14);
      head.y += (target.y - head.y) * Math.min(1, dt * 14);
      speed += (Math.hypot(head.x - px, head.y - py) / Math.max(dt, 0.001) - speed) * Math.min(1, dt * 10);

      const t = now / 1000;
      pts.push({ x: head.x, y: head.y, t });
      while (pts.length && t - pts[0].t > LIFE) pts.shift();

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const n = pts.length;
      if (n > 2) {
        // ribbon: for each strand draw short segments that get thinner and fainter toward the tail
        for (const k of STRANDS) {
          let prev: { x: number; y: number } | null = null;
          for (let i = 1; i < n; i++) {
            const a = pts[i - 1], b = pts[i];
            const age = Math.min(1, (t - b.t) / LIFE);          // 0 at the head, 1 at the tail
            // normal to the path so the strands can spread sideways
            const dx = b.x - a.x, dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len, ny = dx / len;
            const fan = k * (0.6 + 12 * Math.pow(age, 1.15)) * (0.75 + 0.25 * Math.sin(time * 9 + i * 0.3 + k * 2));
            const x = b.x + nx * fan, y = b.y + ny * fan;
            if (prev) {
              const fade = Math.pow(1 - age, 1.25);
              const [r, g, bl] = colourAt(age);
              const core = k === 0;
              // soft glow pass
              ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},${0.1 * fade * (core ? 1.4 : 0.8)})`;
              ctx.lineWidth = (core ? 14 : 8) * (1 - age * 0.7);
              ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(x, y); ctx.stroke();
              // bright thin line
              ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},${(core ? 0.95 : 0.6) * fade})`;
              ctx.lineWidth = (core ? 2.6 : 1.3) * (1 - age * 0.85) + 0.3;
              ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(x, y); ctx.stroke();
            }
            prev = { x, y };
          }
        }
      }

      // head: pulsing glow + a small swirl of flame curls
      const moving = Math.min(1, speed / 500);
      const pulse = 0.85 + 0.15 * Math.sin(time * 7);
      const r0 = (13 + 9 * moving) * pulse;
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r0 * 2.4);
      g.addColorStop(0, "rgba(245,255,200,0.95)");
      g.addColorStop(0.25, "rgba(190,245,70,0.55)");
      g.addColorStop(1, "rgba(60,205,100,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(head.x, head.y, r0 * 2.4, 0, Math.PI * 2); ctx.fill();

      ctx.lineWidth = 1.6;
      for (let c = 0; c < 4; c++) {
        const a0 = time * (5 + c * 1.3) + c * 1.7;
        const rr = (6 + c * 2.6) * (0.8 + 0.5 * moving);
        ctx.strokeStyle = `rgba(${c % 2 ? "200,255,90" : "255,255,210"},${0.75 - c * 0.12})`;
        ctx.beginPath(); ctx.arc(head.x, head.y, rr, a0, a0 + 1.5 + moving); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX; target.y = e.clientY;
      if (!seen) { head.x = target.x; head.y = target.y; seen = true; }
    };
    const onLeave = () => { seen = false; pts.length = 0; ctx.clearRect(0, 0, w, h); };
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(frame); } };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: 9990, pointerEvents: "none" }}
    />
  );
}
