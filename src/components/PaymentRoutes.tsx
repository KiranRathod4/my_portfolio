"use client";

import { useEffect, useRef } from "react";

/**
 * Background for the About section: a faint dot grid with glowing payment routes
 * arcing between city nodes, pulses of "money" travelling along them.
 * Pauses when off screen; static for reduced motion.
 */
const NODES: [number, number][] = [
  [0.12, 0.55], [0.27, 0.32], [0.42, 0.62], [0.55, 0.28], [0.68, 0.58], [0.82, 0.34], [0.9, 0.7], [0.35, 0.85], [0.6, 0.86],
];
const ROUTES: [number, number][] = [[0, 1], [1, 3], [3, 5], [0, 2], [2, 4], [4, 6], [2, 7], [4, 8], [1, 2], [3, 4], [5, 6]];

export default function PaymentRoutes() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0, visible = true;
    const pulses = ROUTES.map((_, i) => ({ t: (i * 0.37) % 1, v: 0.1 + (i % 4) * 0.035 }));

    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const pt = (n: number) => [NODES[n][0] * W, NODES[n][1] * H] as const;
    const bez = (a: number, b: number, t: number) => {
      const [x0, y0] = pt(a), [x1, y1] = pt(b);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * 0.32;
      const u = 1 - t;
      return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
    };

    const draw = (dt: number, time: number) => {
      ctx.clearRect(0, 0, W, H);
      // dot grid
      ctx.fillStyle = "rgba(255,255,255,0.11)";
      const gap = 34;
      for (let x = gap / 2; x < W; x += gap) for (let y = gap / 2; y < H; y += gap) ctx.fillRect(x, y, 1.4, 1.4);
      // routes
      ROUTES.forEach(([a, b]) => {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const [x, y] = bez(a, b, i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.strokeStyle = "rgba(180,240,60,0.32)"; ctx.lineWidth = 1.2; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
      });
      // pulses
      pulses.forEach((p, i) => {
        if (!reduce) p.t = (p.t + dt * p.v) % 1;
        const [a, b] = ROUTES[i];
        for (let k = 0; k < 14; k++) {
          const tt = p.t - k * 0.012;
          if (tt < 0) continue;
          const [x, y] = bez(a, b, tt);
          ctx.beginPath(); ctx.arc(x, y, Math.max(0.4, 3.4 - k * 0.22), 0, 6.283);
          ctx.fillStyle = `rgba(190,245,80,${(1 - k / 14) * 0.9})`; ctx.fill();
        }
      });
      // nodes
      NODES.forEach(([nx, ny], i) => {
        const x = nx * W, y = ny * H, pulse = reduce ? 0.5 : (Math.sin(time * 1.6 + i * 1.7) + 1) / 2;
        ctx.beginPath(); ctx.arc(x, y, 9 + pulse * 9, 0, 6.283); ctx.strokeStyle = `rgba(180,240,60,${0.4 * (1 - pulse)})`; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.283); ctx.fillStyle = "#b4f03c"; ctx.fill();
      });
    };

    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) { last = now; return; }
      draw(Math.min(0.05, (now - last) / 1000), now / 1000); last = now;
    };
    resize(); draw(0, 0);
    if (!reduce) raf = requestAnimationFrame(loop);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const ro = new ResizeObserver(() => { resize(); draw(0, 0); });
    ro.observe(cv);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />;
}
