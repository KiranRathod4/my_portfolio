"use client";

import { useEffect, useRef } from "react";
import { SIGNATURE } from "@/lib/signaturePath";

/**
 * Draws the signature as if it were being written: the ink appears along the real centreline
 * of the signature, with a small lime pen tip leading it. It writes, holds, fades, and writes
 * again, and it also restarts every time it scrolls back into view.
 */
const WRITE = 3.4;   // seconds to write it
const HOLD = 3.6;    // seconds to stay on screen
const FADE = 0.7;    // seconds to fade before writing again

export default function SignatureWrite({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { w: SW, h: SH, pts } = SIGNATURE;
    const n = pts.length / 3;
    const ink = new Image();
    let inkReady = false;
    ink.onload = () => { inkReady = true; if (reduced) drawStatic(); };
    ink.src = "/images/kiran-signature.png";

    const mask = document.createElement("canvas");
    const mctx = mask.getContext("2d")!;
    let cw = 0, ch = 0, k = 1;
    let idx = 0;                       // how many points have been revealed
    let start = performance.now();
    let raf = 0, visible = false, alive = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width * dpr)); ch = Math.round(cw * (SH / SW));
      canvas.width = mask.width = cw; canvas.height = mask.height = ch;
      k = cw / SW;
      idx = 0; mctx.clearRect(0, 0, cw, ch);
    };

    const drawStatic = () => { ctx.clearRect(0, 0, cw, ch); if (inkReady) ctx.drawImage(ink, 0, 0, cw, ch); };

    const restart = () => { start = performance.now(); idx = 0; mctx.clearRect(0, 0, cw, ch); };

    const frame = (now: number) => {
      if (!alive || !visible || document.hidden) { raf = 0; return; }
      raf = requestAnimationFrame(frame);
      if (!inkReady) return;

      let t = (now - start) / 1000;
      const cycle = WRITE + HOLD + FADE;
      if (t >= cycle) { restart(); t = 0; }

      // handwriting has an uneven rhythm: a slow start, a fast middle, a slow finish
      const f = Math.min(1, t / WRITE);
      const prog = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const alpha = t < WRITE + HOLD ? 1 : Math.max(0, 1 - (t - WRITE - HOLD) / FADE);

      // reveal every point whose writing-time has been reached
      mctx.fillStyle = "#fff";
      const rad = 9.5 * k;
      let lastX = -1, lastY = -1;
      while (idx < n && pts[idx * 3 + 2] <= prog) {
        lastX = pts[idx * 3] * k; lastY = pts[idx * 3 + 1] * k;
        mctx.beginPath(); mctx.arc(lastX, lastY, rad, 0, Math.PI * 2); mctx.fill();
        idx++;
      }

      ctx.clearRect(0, 0, cw, ch);
      ctx.globalAlpha = alpha;
      ctx.drawImage(ink, 0, 0, cw, ch);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // pen tip: a small bright dot at the newest ink while writing
      if (t < WRITE && idx > 0 && idx < n) {
        const px = pts[(idx - 1) * 3] * k, py = pts[(idx - 1) * 3 + 1] * k;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 16 * k);
        g.addColorStop(0, "rgba(220,255,120,0.95)"); g.addColorStop(1, "rgba(180,240,60,0)");
        ctx.globalAlpha = 1; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, 16 * k, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const kick = () => { if (!raf && visible && !document.hidden && !reduced) { raf = requestAnimationFrame(frame); } };

    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduced) drawStatic(); });
    ro.observe(wrap);
    // writes again every time it comes back into view
    const io = new IntersectionObserver(([e]) => {
      const was = visible; visible = e.isIntersecting;
      if (visible && !was) { restart(); kick(); }
    }, { threshold: 0.4 });
    io.observe(wrap);
    const onGate = () => { restart(); window.setTimeout(kick, 250); };
    window.addEventListener("gate:done", onGate);
    const onVis = () => kick();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("gate:done", onGate);
    };
  }, []);

  return (
    <div ref={wrapRef} className={className} role="img" aria-label="Kiran Rathod's signature" style={{ aspectRatio: `${SIGNATURE.w} / ${SIGNATURE.h}` }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
