"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Plane, FileSearch, Clapperboard, Braces, ShieldCheck, Cloud, FlaskConical, X, Github, ExternalLink } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PROJECTS, type Project } from "@/lib/projects";
import "./ProjectArchive.css";

const ICONS = {
  plane: Plane, file: FileSearch, film: Clapperboard, code: Braces,
  shield: ShieldCheck, cloud: Cloud, flask: FlaskConical,
} as const;

/* ------------------------------------------------------------------ */
/* Copy: edit freely                                                   */
/* ------------------------------------------------------------------ */
const BOX_LABEL = "KIRAN RATHOD  /  SELECTED WORK";

/* ------------------------------------------------------------------ */
/* Box geometry (px before responsive scaling)                         */
/* ------------------------------------------------------------------ */
const PITCH = 136;     // spacing between cards
const CARD_D = 210;    // card width (across the box)
const CARD_H = 220;    // card height
const T = 18;          // box wall thickness
const PAD = 46;        // gap between the inner wall and the first/last card
const H = 140;         // wall height
const D = 280;         // box depth
const LID_T = 14;      // lid thickness
const REST = 26;       // card bottom height when raised
const SUNK = H - CARD_H - 14; // card bottom height when hidden inside the box
const LID_OPEN = 102;  // degrees

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789+*#<>/";
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Decodes text left to right through random glyphs */
function useScramble(target: string) {
  const [text, setText] = useState(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setText(target); return; }
    let frame = 0;
    const id = window.setInterval(() => {
      frame++;
      const reveal = Math.floor((frame / 16) * target.length);
      setText(target.split("").map((c, i) => (c === " " ? " " : i < reveal ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(""));
      if (frame >= 16) { window.clearInterval(id); setText(target); }
    }, 34);
    return () => window.clearInterval(id);
  }, [target]);
  return text;
}

/** A flat rectangle placed in 3D. `t` is the transform applied to a rect centred on the origin. */
function F({ w, h, t, cls = "", children }: { w: number; h: number; t: string; cls?: string; children?: ReactNode }) {
  return (
    <div className={`arc-f ${cls}`} style={{ left: -w / 2, top: -h / 2, width: w, height: h, transform: t }}>
      {children}
    </div>
  );
}

// orientation helpers: rotate a rect so it stands up facing +y / -y / +x / -x
const UP_FRONT = "rotateX(-90deg)";                    // faces +y
const UP_BACK = "rotateX(90deg)";                      // faces -y
const UP_RIGHT = "rotateZ(-90deg) rotateX(-90deg)";    // faces +x
const UP_LEFT = "rotateZ(90deg) rotateX(-90deg)";      // faces -x

export default function ProjectArchive() {
  const n = PROJECTS.length;
  const W = n * PITCH + 2 * (PAD + T);
  const cavityW = W - 2 * T;
  const cavityD = D - 2 * T;
  const projW = 0.866 * W + 0.5 * D; // on-screen width of the box before scaling

  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const oRef = useRef(0);

  const [o, setO] = useState(0);                 // 0 = closed, 1 = fully open (animated)
  const [wantOpen, setWantOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [dims, setDims] = useState({ w: 1200, h: 800 });
  const [hover, setHover] = useState<number | null>(null);
  const [active, setActive] = useState<Project | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [tip, setTip] = useState({ x: 0, y: 0 });

  useEffect(() => { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);

  // animate the open/close value toward its target
  useEffect(() => {
    const target = wantOpen ? 1 : 0;
    if (reduced) { oRef.current = target; setO(target); return; }
    let raf = 0;
    const tick = () => {
      const next = oRef.current + (target - oRef.current) * 0.085;
      oRef.current = Math.abs(target - next) < 0.002 ? target : next;
      setO(oRef.current);
      if (oRef.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wantOpen, reduced]);

  // measure + reveal when scrolled into view
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.25 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const insideZone = (x: number, y: number, margin = 24) => {
    const r = zoneRef.current?.getBoundingClientRect();
    return !!r && x > r.left - margin && x < r.right + margin && y > r.top - margin && y < r.bottom + margin;
  };

  const onMove = (e: React.PointerEvent) => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top });
    if (e.pointerType === "mouse") setWantOpen(insideZone(e.clientX, e.clientY));
  };
  const onDown = (e: React.PointerEvent) => {
    // touch screens have no hover: tap the box to toggle it
    if (e.pointerType !== "mouse" && insideZone(e.clientX, e.clientY, 0)) setWantOpen((v) => !v);
  };

  /* ---- layout: the box sits in the centre ---- */
  const wide = dims.w > 820;
  const availW = dims.w - 2 * Math.max(56, dims.w * 0.06);
  const scale = wide
    ? clamp((availW / projW) * 0.7, 0.42, Math.min(1.05, (dims.h - 330) / 600))
    : clamp((dims.w * 0.92) / projW, 0.42, 0.9);
  const boxCx = dims.w / 2;
  const boxX = boxCx - dims.w / 2;
  const camTop = wide ? 0.68 : 0.72;

  /* ---- open / close choreography ---- */
  const lid = ease(clamp(o / 0.5)) * LID_OPEN;
  const step = 0.22 / Math.max(1, n - 1);
  const ready = o > 0.92;
  const infoOpacity = clamp((o - 0.85) / 0.12);

  const current = hover !== null && ready ? PROJECTS[hover] : null;
  const label = useScramble(current ? current.title : "Pick a card to preview");

  const zoneW = projW * scale * 1.04;
  const zoneH = 470 * scale;

  return (
    <div
      id="projects"
      role="region"
      aria-label="Projects"
      ref={rootRef}
      className="arc-section"
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerLeave={() => { setTilt({ x: 0, y: 0 }); setHover(null); setWantOpen(false); }}
    >
      <div className="arc-bg" aria-hidden />

      <div className="arc-head">
        <SectionTitle kicker="Projects" white="Things I've built" lime="and shipped." className="st-compact" />
      </div>

      {/* hover zone around the box (not rendered visibly) */}
      <div
        ref={zoneRef}
        className="arc-zone"
        aria-hidden
        style={{ left: dims.w / 2 + boxX - zoneW / 2, top: dims.h * camTop - zoneH * 0.72, width: zoneW, height: zoneH }}
      />

      {/* 3D stage */}
      <div className="arc-stage" style={{ opacity: seen ? 1 : 0, transform: `translateX(${seen ? 0 : 80}px)` }}>
        <div className="arc-glow" aria-hidden style={{ left: `calc(50% + ${boxX}px)` }} />
        <div className="arc-camera" style={{ top: `${camTop * 100}%`, transform: `translate(${boxX}px, 0) scale(${scale})` }}>
          <div className="arc-scene" style={{ transform: `rotateX(${58 - tilt.y * 6}deg) rotateZ(${30 + tilt.x * 10}deg)` }}>
            {/* floor + inner liner */}
            <F w={cavityW} h={cavityD} t="translate3d(0,0,6px)" cls="arc-cavity-floor" />
            <F w={cavityW} h={H} t={`translate3d(0, ${-D / 2 + T}px, ${H / 2}px) ${UP_FRONT}`} cls="arc-inner" />
            <F w={cavityD} h={H} t={`translate3d(${-W / 2 + T}px, 0, ${H / 2}px) ${UP_RIGHT}`} cls="arc-inner" />
            <F w={cavityW} h={H} t={`translate3d(0, ${D / 2 - T}px, ${H / 2}px) ${UP_BACK}`} cls="arc-inner arc-inner-dark" />
            <F w={cavityD} h={H} t={`translate3d(${W / 2 - T}px, 0, ${H / 2}px) ${UP_LEFT}`} cls="arc-inner arc-inner-dark" />

            {/* mirrored label on the glossy floor in front of the box */}
            <F w={W} h={H} t={`translate3d(0, ${D / 2}px, ${-H / 2 - 2}px) ${UP_FRONT} scaleY(-1)`} cls="arc-reflect"><span>{BOX_LABEL}</span></F>

            {/* cards (drawn before the outer walls so the walls hide their lower part) */}
            {PROJECTS.map((proj, i) => {
              const Icon = ICONS[proj.icon];
              const x = -W / 2 + T + PAD + PITCH / 2 + i * PITCH;
              const rise = ease(clamp((o - 0.38 - i * step) / 0.38));
              const bottom = lerp(SUNK, REST, rise);
              const isHover = hover === i && ready;
              return (
                <div
                  key={proj.id}
                  className="arc-card"
                  style={{
                    left: -CARD_D / 2, top: -CARD_H / 2, width: CARD_D, height: CARD_H,
                    transform: `translate3d(${x}px, 0, ${bottom + CARD_H / 2}px) ${UP_RIGHT}`,
                    pointerEvents: ready ? "auto" : "none",
                  }}
                >
                  <div
                    className={`arc-lift ${isHover ? "is-hover" : ""}`}
                    style={{ ["--cut" as string]: `${Math.max(0, 8 - bottom)}px`, ["--accent" as string]: proj.color }}
                  >
                    <div className="arc-edge arc-edge-top" />
                    <div className="arc-edge arc-edge-l" />
                    <div className="arc-edge arc-edge-r" />
                    <div className="arc-card-back" />
                    <button
                      type="button"
                      className="arc-card-face"
                      tabIndex={ready ? 0 : -1}
                      aria-label={`Open project: ${proj.title}`}
                      onPointerEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      onClick={() => setActive(proj)}
                    >
                      <span className="arc-card-idx">#{String(i + 1).padStart(2, "0")}</span>
                      <span className="arc-card-title">{proj.title}</span>
                      <Icon className="arc-card-icon" strokeWidth={1.25} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* outer walls */}
            <F w={W} h={H} t={`translate3d(0, ${D / 2}px, ${H / 2}px) ${UP_FRONT}`} cls="arc-wall arc-front"><span>{BOX_LABEL}</span></F>
            <F w={W} h={H} t={`translate3d(0, ${-D / 2}px, ${H / 2}px) ${UP_BACK}`} cls="arc-wall" />
            <F w={D} h={H} t={`translate3d(${W / 2}px, 0, ${H / 2}px) ${UP_RIGHT}`} cls="arc-wall arc-side" />
            <F w={D} h={H} t={`translate3d(${-W / 2}px, 0, ${H / 2}px) ${UP_LEFT}`} cls="arc-wall arc-side" />

            {/* rim (top surface of the walls) */}
            <F w={W} h={T} t={`translate3d(0, ${D / 2 - T / 2}px, ${H}px)`} cls="arc-rim" />
            <F w={W} h={T} t={`translate3d(0, ${-D / 2 + T / 2}px, ${H}px)`} cls="arc-rim" />
            <F w={T} h={D - 2 * T} t={`translate3d(${-W / 2 + T / 2}px, 0, ${H}px)`} cls="arc-rim" />
            <F w={T} h={D - 2 * T} t={`translate3d(${W / 2 - T / 2}px, 0, ${H}px)`} cls="arc-rim" />

            {/* lid, hinged on the back edge */}
            <div className="arc-hinge" style={{ transform: `translate3d(0, ${-D / 2}px, ${H}px) rotateX(${lid}deg)` }}>
              <F w={W} h={D} t={`translate3d(0, ${D / 2}px, ${LID_T}px)`} cls="arc-lid-top" />
              <F w={W} h={D} t={`translate3d(0, ${D / 2}px, 0px)`} cls="arc-lid-under" />
              <F w={W} h={LID_T} t={`translate3d(0, ${D}px, ${LID_T / 2}px) ${UP_FRONT}`} cls="arc-lid-edge" />
              <F w={W} h={LID_T} t={`translate3d(0, 0px, ${LID_T / 2}px) ${UP_BACK}`} cls="arc-lid-edge" />
              <F w={D} h={LID_T} t={`translate3d(${-W / 2}px, ${D / 2}px, ${LID_T / 2}px) ${UP_LEFT}`} cls="arc-lid-edge" />
              <F w={D} h={LID_T} t={`translate3d(${W / 2}px, ${D / 2}px, ${LID_T / 2}px) ${UP_RIGHT}`} cls="arc-lid-edge" />
            </div>
          </div>
        </div>
      </div>

      {/* keyboard access: toggle the box without a mouse */}
      <button
        type="button"
        className="arc-sr-toggle"
        aria-expanded={wantOpen}
        onClick={() => setWantOpen((v) => !v)}
      >
        {wantOpen ? "Close project box" : "Open project box"}
      </button>

      <div className={`arc-tip ${current ? "on" : ""}`} style={{ transform: `translate(${tip.x + 16}px, ${tip.y + 16}px)` }}>Open</div>

      <p className="arc-open-hint" style={{ opacity: seen ? clamp(1 - o * 3) : 0 }} aria-hidden>
        <span className="arc-hint-hover">Hover the box to open it</span>
        <span className="arc-hint-tap">Tap the box to open it</span>
      </p>

      <div className={`arc-info ${current ? "on" : ""}`} style={{ opacity: infoOpacity, ["--accent" as string]: current ? current.color : "#b4f03c" }}>
        <span className="arc-info-bar" aria-hidden />
        <div className="arc-info-main">
          <p className="arc-info-count">{current ? `${String(hover! + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}` : `${String(n).padStart(2, "0")} projects`}</p>
          <p className="arc-info-label" aria-live="polite">{label}</p>
          <p className="arc-info-hint">{current ? current.desc : "Click a card to open it"}</p>
        </div>
        {current && <ul className="arc-info-tags">{current.tags.slice(0, 4).map((t) => <li key={t}>{t}</li>)}</ul>}
      </div>

      {/* detail modal */}
      <AnimatePresence>
        {active && (
          <motion.div className="arc-modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActive(null)}>
            <motion.div
              className="arc-modal"
              role="dialog"
              aria-modal="true"
              aria-label={active.title}
              initial={{ y: 40, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 24, scale: 0.97, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="arc-modal-x" onClick={() => setActive(null)} aria-label="Close"><X size={18} /></button>
              <div className="arc-modal-img">
                <Image src={active.image} alt={active.title} fill sizes="(max-width: 720px) 90vw, 560px" style={{ objectFit: "cover" }} />
              </div>
              <div className="arc-modal-body">
                <h3>{active.title}</h3>
                <p>{active.desc}</p>
                <ul>{active.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                <div className="arc-modal-links">
                  <a href={active.github} target="_blank" rel="noopener noreferrer"><Github size={16} /> Code</a>
                  {active.live && <a href={active.live} target="_blank" rel="noopener noreferrer" className="solid"><ExternalLink size={16} /> Live demo</a>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
