"use client";

import { useEffect, useRef } from "react";

/**
 * Canvas animation: rupee notes drifting along a sine "river" from left to right.
 * - pauses when off-screen
 * - speeds up with scroll velocity
 * - notes near the pointer are nudged away
 * - respects prefers-reduced-motion (draws one still frame)
 */

type Note = {
  u: number; // 0..1 progress along the river
  speed: number;
  lane: number; // -1..1 offset across the river
  z: number; // 0 (far) .. 1 (near)
  flip: number;
  flipSpeed: number;
  tint: 0 | 1 | 2;
};

const TINTS = [
  { a: "#2f7a5f", b: "#1c4d3d", ink: "#d9efe4" }, // green
  { a: "#3a8f7d", b: "#215f55", ink: "#dff5ef" }, // teal
  { a: "#c9a24a", b: "#8f6e22", ink: "#fff4d6" }, // gold
];

export default function MoneyFlow({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1;
    let visible = true;
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let boost = 0;
    let lastScrollY = window.scrollY;
    const pointer = { x: -9999, y: -9999 };

    const notes: Note[] = [];
    const build = () => {
      notes.length = 0;
      const count = w < 700 ? 18 : 36;
      for (let i = 0; i < count; i++) {
        const z = Math.random();
        notes.push({
          u: Math.random(),
          speed: 0.025 + z * 0.045 + Math.random() * 0.01,
          lane: Math.random() * 2 - 1,
          z,
          flip: Math.random() * Math.PI * 2,
          flipSpeed: 0.8 + Math.random() * 1.6,
          tint: Math.random() < 0.14 ? 2 : Math.random() < 0.5 ? 0 : 1,
        });
      }
      notes.sort((a, b) => a.z - b.z);
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    // River centre line
    const riverY = (x: number, t: number) =>
      h * 0.52 + Math.sin(x * 0.0042 + t * 0.6) * h * 0.2 + Math.sin(x * 0.011 - t * 0.9) * h * 0.04;

    const drawNote = (n: Note) => {
      const margin = 160;
      const x = -margin + n.u * (w + margin * 2);
      const baseY = riverY(x, time);
      const spread = h * (0.16 + 0.1 * (1 - n.z));
      let y = baseY + n.lane * spread;
      let px = x;

      // pointer repulsion
      const dx = px - pointer.x, dy = y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 160 * 160) {
        const d = Math.sqrt(d2) || 1;
        const push = (1 - d / 160) * 46;
        px += (dx / d) * push;
        y += (dy / d) * push;
      }

      const slope = (riverY(x + 4, time) - baseY) / 4;
      const ang = Math.atan(slope) + Math.sin(time * 0.8 + n.lane * 3) * 0.18;
      const scale = 0.55 + n.z * 0.75;
      const nw = 118 * scale, nh = 56 * scale;
      const sy = Math.cos(n.flip); // fake 3D flutter

      ctx.save();
      ctx.translate(px, y);
      ctx.rotate(ang);
      ctx.scale(1, Math.abs(sy) < 0.12 ? 0.12 : sy);
      ctx.globalAlpha = 0.35 + n.z * 0.6;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 14 * scale;
      ctx.shadowOffsetY = 6 * scale;

      const c = TINTS[n.tint];
      const g = ctx.createLinearGradient(-nw / 2, -nh / 2, nw / 2, nh / 2);
      g.addColorStop(0, sy > 0 ? c.a : c.b);
      g.addColorStop(1, sy > 0 ? c.b : c.a);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-nw / 2, -nh / 2, nw, nh, 6 * scale);
      ctx.fill();
      ctx.shadowColor = "transparent";

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.roundRect(-nw / 2 + 4 * scale, -nh / 2 + 4 * scale, nw - 8 * scale, nh - 8 * scale, 4 * scale);
      ctx.stroke();

      // rosette
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 0.8;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(nw * 0.22, 0, nh * (0.18 + k * 0.1), nh * (0.34 - k * 0.04), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = c.ink;
      ctx.font = `600 ${nh * 0.55}px Georgia, serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText("₹", -nw * 0.24, 1);
      ctx.font = `500 ${nh * 0.16}px ui-monospace, monospace`;
      ctx.globalAlpha *= 0.8;
      ctx.fillText(n.tint === 2 ? "2000" : "500", nw * 0.22, nh * 0.34);
      ctx.restore();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      boost *= 0.94;

      ctx.clearRect(0, 0, w, h);
      for (const n of notes) {
        n.u += dt * n.speed * (1 + boost);
        if (n.u > 1) { n.u = 0; n.lane = Math.random() * 2 - 1; }
        n.flip += dt * n.flipSpeed;
        drawNote(n);
      }
    };

    const onScroll = () => {
      const dy = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;
      boost = Math.min(boost + dy * 0.02, 5);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => { pointer.x = pointer.y = -9999; };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    if (reduced) {
      time = 2;
      for (const n of notes) drawNote(n);
    } else {
      raf = requestAnimationFrame(frame);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />;
}
