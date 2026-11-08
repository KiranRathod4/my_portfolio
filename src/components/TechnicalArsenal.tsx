"use client";

import { useEffect, useRef } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";

/**
 * Technical Arsenal: pearl orbs that float, jostle and dodge the pointer.
 * Everything is drawn on one 2D canvas from pre-rendered sprites, so it stays smooth:
 * - logos are local files (public/logos), rasterised once at load, no network dependency
 * - orb bodies are pre-rendered sprites, so each frame is just a few dozen drawImage calls
 * - the loop pauses when the section is off screen or the tab is hidden
 * To add a skill: drop an SVG in public/logos and add a line below.
 */
const SKILLS: { name: string; file: string }[] = [
  { name: "Playwright", file: "playwright" },
  { name: "Playwright MCP", file: "playwright-mcp" },
  { name: "Selenium", file: "selenium" },
  { name: "PyTest", file: "pytest" },
  { name: "k6", file: "k6" },
  { name: "Postman", file: "postman" },
  { name: "AI Agents", file: "ai-agents" },
  { name: "Linear", file: "linear" },
  { name: "JIRA", file: "jira" },
  { name: "Python", file: "python" },
  { name: "FastAPI", file: "fastapi" },
  { name: "Docker", file: "docker" },
  { name: "AWS", file: "aws" },
  { name: "Terraform", file: "terraform" },
  { name: "Jenkins", file: "jenkins" },
  { name: "GitHub", file: "github" },
  { name: "Git", file: "git" },
  { name: "Linux", file: "linux" },
  { name: "Airflow", file: "airflow" },
  { name: "Kubeflow", file: "kubeflow" },
  { name: "DVC", file: "dvc" },
  { name: "Hugging Face", file: "huggingface" },
  { name: "Prometheus", file: "prometheus" },
  { name: "Grafana", file: "grafana" },
  { name: "MySQL", file: "mysql" },
  { name: "PowerBI", file: "powerbi" },
];

type Orb = {
  name: string; x: number; y: number; vx: number; vy: number; r: number;
  ph: number; hover: number; hop: number; born: number; logo: HTMLCanvasElement | null;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** Rasterise an SVG once. SVGs without a width/height can come out blank, so one is set explicitly. */
async function loadLogo(file: string, size: number): Promise<HTMLCanvasElement | null> {
  try {
    const res = await fetch(`/logos/${file}.svg`);
    if (!res.ok) return null;
    let svg = await res.text();
    svg = svg.replace(/<svg([^>]*)>/, (_m, attrs: string) =>
      `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} width="${size}" height="${size}">`);
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise<void>((ok, err) => { img.onload = () => ok(); img.onerror = () => err(new Error("img")); img.src = url; });
    const c = document.createElement("canvas");
    c.width = c.height = size;
    c.getContext("2d")!.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(url);
    return c;
  } catch { return null; }
}

/** A glossy pearl orb sprite (body + soft lime rim light), drawn once. */
function makeBody(r: number, dpr: number, glow: number): HTMLCanvasElement {
  const pad = 26;
  const s = (r + pad) * 2 * dpr;
  const c = document.createElement("canvas");
  c.width = c.height = Math.ceil(s);
  const x = c.getContext("2d")!;
  x.scale(dpr, dpr);
  const cx = r + pad, cy = r + pad;
  // soft contact shadow
  x.fillStyle = "rgba(0,0,0,0.45)";
  x.filter = "blur(8px)";
  x.beginPath(); x.ellipse(cx, cy + r * 0.92, r * 0.8, r * 0.2, 0, 0, Math.PI * 2); x.fill();
  x.filter = "none";
  // lime halo
  x.shadowColor = `rgba(180,240,60,${0.16 + glow * 0.5})`;
  x.shadowBlur = 12 + glow * 22;
  const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.55, "#eceee9");
  g.addColorStop(1, "#aeb7ab");
  x.fillStyle = g;
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.shadowBlur = 0;
  // thin lower rim shade for depth
  const rim = x.createRadialGradient(cx, cy, r * 0.78, cx, cy, r);
  rim.addColorStop(0, "rgba(0,0,0,0)"); rim.addColorStop(1, "rgba(40,60,30,0.28)");
  x.fillStyle = rim; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  // specular highlight
  const h = x.createRadialGradient(cx - r * 0.38, cy - r * 0.46, 0, cx - r * 0.38, cy - r * 0.46, r * 0.42);
  h.addColorStop(0, "rgba(255,255,255,0.95)"); h.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = h; x.beginPath(); x.arc(cx - r * 0.38, cy - r * 0.46, r * 0.42, 0, Math.PI * 2); x.fill();
  return c;
}

export default function TechnicalArsenal() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, R = 44;
    let orbs: Orb[] = [];
    let bodies: { normal: HTMLCanvasElement; glow: HTMLCanvasElement } | null = null;
    let raf = 0, visible = false, last = performance.now(), time = 0;
    let labelFont = "ui-monospace, Menlo, monospace";
    const ptr = { x: -9999, y: -9999, on: false };
    let hovered: Orb | null = null;
    let alive = true;

    const logoPx = () => Math.round(R * 1.6 * dpr);

    // ------------------------------------------------------------------ layout
    const build = (resetPositions: boolean) => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      R = clamp(Math.sqrt((0.27 * W * H) / (SKILLS.length * Math.PI)), 26, 54);
      bodies = { normal: makeBody(R, dpr, 0), glow: makeBody(R, dpr, 1) };
      labelFont = getComputedStyle(wrap).getPropertyValue("--font-mono").trim() || "ui-monospace, Menlo, monospace";

      if (resetPositions || !orbs.length) {
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        const prev = new Map(orbs.map((o) => [o.name, o.logo]));
        orbs = SKILLS.map((s, i) => ({
          name: s.name,
          x: W / 2 + (rnd() - 0.5) * W * 0.7, y: H / 2 + (rnd() - 0.5) * H * 0.6,
          vx: 0, vy: 0, r: R * (0.9 + rnd() * 0.2), ph: rnd() * Math.PI * 2, hover: 0, hop: 0,
          born: performance.now() + i * 40, logo: prev.get(s.name) ?? null,
        }));
        for (let i = 0; i < 80; i++) step(1 / 60, true);          // settle before the first frame
      } else {
        orbs.forEach((o) => { o.r = R * (o.r > 0 ? clamp(o.r / R, 0.9, 1.1) : 1); o.x = clamp(o.x, o.r, W - o.r); o.y = clamp(o.y, o.r, H - o.r); });
      }
    };

    // ------------------------------------------------------------------ physics
    const step = (dt: number, settling = false) => {
      const cx = W / 2, cy = H / 2 - 8;
      const gap = R * 0.62 + 10;   // leaves room for the name under each orb
      const pr = R * 2.9;
      for (const o of orbs) {
        // pull toward the middle (stronger sideways so the cloud fills the wide arena)
        let fx = (cx - o.x) * 0.55, fy = (cy - o.y) * 0.9;
        // lazy floating
        fx += Math.sin(time * 0.6 + o.ph) * 9; fy += Math.cos(time * 0.5 + o.ph * 1.3) * 9;
        // dodge the pointer
        if (ptr.on) {
          const dx = o.x - ptr.x, dy = o.y - ptr.y, d = Math.hypot(dx, dy) || 1;
          if (d < pr) { const f = Math.pow(1 - d / pr, 2) * 3400; fx += (dx / d) * f; fy += (dy / d) * f; }
        }
        o.vx += fx * dt; o.vy += fy * dt;
      }
      // soft collisions
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const a = orbs[i], b = orbs[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const min = a.r + b.r + gap;
          const d2 = dx * dx + dy * dy;
          if (d2 < min * min) {
            const d = Math.sqrt(d2) || 0.001, o = (min - d) * 0.5, nx = dx / d, ny = dy / d;
            a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) { const j2 = -rv * 0.5; a.vx -= nx * j2; a.vy -= ny * j2; b.vx += nx * j2; b.vy += ny * j2; }
          }
        }
      }
      const damp = Math.exp(-dt * (settling ? 6 : 2.0));
      for (const o of orbs) {
        o.vx *= damp; o.vy *= damp;
        // a fast-moving orb lifts and swells slightly, then settles
        o.hop = Math.max(o.hop * Math.exp(-dt * 4.5), clamp(Math.hypot(o.vx, o.vy) / 460));
        o.x += o.vx * dt; o.y += o.vy * dt;
        // keep inside the arena (leaving room under each orb for its label)
        const m = 8;
        if (o.x < o.r + m) { o.x = o.r + m; o.vx = Math.abs(o.vx) * 0.4; }
        if (o.x > W - o.r - m) { o.x = W - o.r - m; o.vx = -Math.abs(o.vx) * 0.4; }
        if (o.y < o.r + m) { o.y = o.r + m; o.vy = Math.abs(o.vy) * 0.4; }
        if (o.y > H - o.r - m - 18) { o.y = H - o.r - m - 18; o.vy = -Math.abs(o.vy) * 0.4; }
      }
    };

    // ------------------------------------------------------------------ drawing
    const draw = (now: number, dt: number) => {
      if (!bodies) return;
      ctx.clearRect(0, 0, W, H);
      // which orb is under the pointer?
      let hit: Orb | null = null;
      if (ptr.on) {
        let best = 1e9;
        for (const o of orbs) { const d = Math.hypot(o.x - ptr.x, o.y - ptr.y); if (d < o.r * 1.05 && d < best) { best = d; hit = o; } }
      }
      hovered = hit;

      const order = [...orbs].sort((a, b) => a.hover - b.hover);   // hovered orb drawn last, on top
      const pad = 26;
      for (const o of order) {
        o.hover += ((o === hit ? 1 : 0) - o.hover) * Math.min(1, dt * 11);
        const age = clamp((now - o.born) / 700);
        if (age <= 0) continue;
        const intro = 1 - Math.pow(1 - age, 3);
        const s = (0.35 + 0.65 * intro) * (1 + 0.16 * o.hover) * (1 + 0.07 * o.hop);
        const lift = -9 * o.hop;
        const size = (o.r + pad) * 2 * s;
        ctx.globalAlpha = intro;
        // body sprite: normal, cross-faded with the glowing one while hovered
        ctx.drawImage(bodies.normal, o.x - size / 2, o.y + lift - size / 2, size, size);
        if (o.hover > 0.02) { ctx.globalAlpha = intro * o.hover; ctx.drawImage(bodies.glow, o.x - size / 2, o.y + lift - size / 2, size, size); }
        ctx.globalAlpha = intro;
        // logo, nudged a little toward the pointer for a hint of 3D
        const ls = o.r * 1.18 * s;
        let ox = 0, oy = 0;
        if (ptr.on) { const dx = ptr.x - o.x, dy = ptr.y - o.y, d = Math.hypot(dx, dy) || 1; const k = Math.min(1, 160 / d) * 3; ox = (dx / d) * k; oy = (dy / d) * k; }
        if (o.logo) ctx.drawImage(o.logo, o.x - ls / 2 + ox, o.y + lift - ls / 2 + oy, ls, ls);
        else { ctx.fillStyle = "#1c2a14"; ctx.font = `700 ${o.r * 0.7}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.name[0], o.x, o.y); }
      }
      ctx.globalAlpha = 1;

      // labels
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const o of order) {
        const age = clamp((performance.now() - o.born) / 700);
        if (age <= 0) continue;
        const fs = o.hover > 0.5 ? 13 : 11;
        ctx.font = `500 ${fs}px ${labelFont}`;
        const ly = o.y + o.r * (1 + 0.16 * o.hover) + 16;
        if (o.hover > 0.05) {
          const tw = ctx.measureText(o.name).width + 22;
          ctx.globalAlpha = clamp(o.hover) * age;
          ctx.fillStyle = "rgba(14,20,11,0.92)";
          ctx.strokeStyle = "rgba(180,240,60,0.7)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.roundRect(o.x - tw / 2, ly - 12, tw, 24, 12); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = age;
        ctx.lineJoin = "round"; ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(6,8,6,0.9)";
        ctx.strokeText(o.name, o.x, ly);
        ctx.fillStyle = o.hover > 0.05 ? "#d9ff7a" : "rgba(255,255,255,0.72)";
        ctx.fillText(o.name, o.x, ly);
      }
      ctx.globalAlpha = 1;
      canvas.style.cursor = hovered ? "pointer" : "default";
    };

    // ------------------------------------------------------------------ loop
    const frame = (now: number) => {
      if (!alive || !visible || document.hidden) { raf = 0; return; }
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now; time += dt;
      const sub = 2;
      for (let i = 0; i < sub; i++) step(dt / sub);
      draw(now, dt);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };

    // reduced motion: no animation, just redraw on hover
    let queued = false;
    const redraw = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; draw(performance.now() + 5000, 1 / 30); }); };

    // ------------------------------------------------------------------ input
    const setPtr = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
      ptr.on = ptr.x >= 0 && ptr.y >= 0 && ptr.x <= r.width && ptr.y <= r.height;
      if (reduced) redraw();
    };
    const onLeave = () => { ptr.on = false; if (reduced) redraw(); };
    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top, reach = R * 4.2;
      for (const o of orbs) {
        const dx = o.x - px, dy = o.y - py, d = Math.hypot(dx, dy) || 1;
        if (d < reach) { const k = (1 - d / reach) * 720; o.vx += (dx / d) * k; o.vy += (dy / d) * k; }
      }
    };

    // ------------------------------------------------------------------ setup
    build(true);
    const ro = new ResizeObserver(() => { const rect = wrap.getBoundingClientRect(); if (Math.abs(rect.width - W) > 1) { build(true); loadAll(); if (reduced) redraw(); } });
    ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { rootMargin: "120px 0px" });
    io.observe(wrap);
    const onVis = () => { if (!document.hidden) start(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointermove", setPtr, { passive: true });
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);

    const loadAll = () => {
      const size = logoPx();
      SKILLS.forEach(async (s) => {
        const logo = await loadLogo(s.file, size);
        if (!alive) return;
        const o = orbs.find((x) => x.name === s.name);
        if (o) o.logo = logo;
        if (reduced) redraw();
      });
    };
    loadAll();
    if (reduced) { orbs.forEach((o) => { o.born = 0; }); setTimeout(redraw, 300); }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", setPtr);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div id="arsenal" className="ta-section" role="region" aria-label="Technical arsenal">
      <SectionTitle kicker="Technical arsenal" white="The tools I" lime="reach for." sub="Testing, automation, cloud and AI agents." />
      <div ref={wrapRef} className="ta-arena">
        <canvas ref={canvasRef} aria-hidden style={{ display: "block", touchAction: "pan-y" }} />
      </div>
      <ul className="ta-sr">{SKILLS.map((s) => <li key={s.name}>{s.name}</li>)}</ul>

      <style>{`
        .ta-section { position: relative; background: #0a0a0a; padding: 110px 0 90px; overflow: hidden;
          background-image: radial-gradient(900px 520px at 50% 62%, rgba(120,190,40,0.07), transparent 70%); }
        .ta-head { padding: 0 24px; }
        .ta-sub { margin-top: 18px; text-align: center; font-family: var(--font-mono), monospace; font-size: 12px; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(255,255,255,0.4); }
        .ta-arena { width: min(1240px, 94vw); height: 580px; margin: 50px auto 0; }
        .ta-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        @media (max-width: 700px) { .ta-arena { height: 640px; margin-top: 30px; } }
      `}</style>
    </div>
  );
}
