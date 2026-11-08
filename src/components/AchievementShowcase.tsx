"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { sfx } from "@/lib/sfx";
import { MODES, type Mode } from "./ShowcaseScene";
import "./AchievementShowcase.css";

const ShowcaseScene = dynamic(() => import("./ShowcaseScene"), { ssr: false });

const MODE_LABEL: Record<Mode, string> = {
  stretch: "Stretch", bulge: "Bulge", drum: "Drum", shatter: "Shatter", dust: "Dust",
};

const SCROLL_PER_CARD = 0.85; // viewport heights of scrolling per card

export default function AchievementShowcase() {
  const items = ACHIEVEMENTS;
  const n = items.length;

  const sectionRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("bulge");
  const [muted, setMuted] = useState(false);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const inViewRef = useRef(false);
  const [simple, setSimple] = useState(false); // reduced motion / no WebGL -> plain cards

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const lastIdx = useRef(0);
  const dragging = useRef(false);
  const snapTimer = useRef<number | null>(null);
  const lastWheel = useRef(0);
  const extraRef = useRef(0);        // forward spin used to loop past the last card
  const shiftRef = useRef(0);
  const lastActivity = useRef(0);
  const inside = useRef(false);
  const lastStep = useRef(0);
  const autoRef = useRef(false);
  const [auto, setAuto] = useState(false);

  // any real input hands control back to the visitor
  const touch = useCallback(() => {
    lastActivity.current = performance.now();
    if (autoRef.current) { autoRef.current = false; setAuto(false); }
  }, []);

  /* ---- capability checks ---- */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let gl = false;
    try { gl = !!document.createElement("canvas").getContext("webgl2"); } catch { gl = false; }
    setSimple(reduced || !gl);
  }, []);

  /* ---- only render while the section is near the screen ---- */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { inViewRef.current = e.isIntersecting; setInView(e.isIntersecting); if (!e.isIntersecting) sfx.scrub(0); }, { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ---- never leave sound running when the section is off screen, the tab is hidden, or we unmount ---- */
  useEffect(() => {
    const quiet = () => { if (document.hidden) sfx.scrub(0); };
    document.addEventListener("visibilitychange", quiet);
    return () => { document.removeEventListener("visibilitychange", quiet); sfx.scrub(0); };
  }, []);
  useEffect(() => { if (!inView) sfx.scrub(0); }, [inView]);

  /* ---- audio can only start after a user gesture ---- */
  useEffect(() => {
    const go = () => sfx.resume();
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return () => { window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
  }, []);
  useEffect(() => { sfx.setMuted(muted); }, [muted]);

  /* ---- called every frame by the scene ---- */
  const onMotion = useCallback((pos: number, vel: number) => {
    if (!inViewRef.current) { sfx.scrub(0); return; }   // off screen: stay silent
    const idx = Math.round(pos);
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      setActive(((idx % n) + n) % n);
      sfx.card(modeRef.current);
    }
    sfx.scrub(Math.min(1, Math.abs(vel) / 2.2));
  }, [n]);

  /* ---- scroll helpers: the page scroll position IS the carousel position ---- */
  const geometry = () => {
    const el = sectionRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const total = Math.max(1, r.height - window.innerHeight);
    return { top: r.top + window.scrollY, total, prog: Math.min(1, Math.max(0, -r.top / total)), r };
  };

  const goTo = useCallback((idx: number) => {
    const g = geometry();
    if (!g) return;
    const clamped = Math.min(n - 1, Math.max(0, idx));
    window.scrollTo({ top: g.top + (clamped / Math.max(1, n - 1)) * g.total, behavior: "smooth" });
  }, [n]);

  // snap to the nearest card shortly after scrolling stops
  useEffect(() => {
    const onScroll = () => {
      if (snapTimer.current) window.clearTimeout(snapTimer.current);
      snapTimer.current = window.setTimeout(() => {
        const g = geometry();
        if (document.documentElement.dataset.achNoSnap) return; // debugging hook
        if (performance.now() - lastWheel.current < 260) { onScroll(); return; } // still flowing: wait
        if (!g || dragging.current || g.prog <= 0.001 || g.prog >= 0.999) return;
        const pos = g.prog * (n - 1);
        if (Math.abs(pos - Math.round(pos)) > 0.03) goTo(Math.round(pos));
      }, 340);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (snapTimer.current) window.clearTimeout(snapTimer.current); };
  }, [goTo, n]);

  // arrow keys while the section is on screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      touch();
      const g = geometry();
      if (!g || g.r.top > window.innerHeight * 0.25 || g.r.bottom < window.innerHeight * 0.75) return;
      e.preventDefault();
      const cur = Math.round(g.prog * (n - 1));
      goTo(cur + (e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, n, touch]);

  /* ---- auto-play: when the mouse rests over the carousel, keep sliding on its own ---- */
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      if (!inside.current || dragging.current) return;
      if (now - lastActivity.current < 1500) return;   // mouse still moving / just scrolled
      if (now - lastStep.current < 2600) return;       // one card at a time
      const g = geometry();
      if (!g || g.r.top > window.innerHeight * 0.2 || g.r.bottom < window.innerHeight * 0.8) return; // only while pinned
      lastStep.current = now;
      if (!autoRef.current) { autoRef.current = true; setAuto(true); }
      const k = Math.round(g.prog * (n - 1));
      if (k < n - 1) {
        goTo(k + 1);
      } else {
        // slide past the last card onto the first, then quietly reset to the start
        extraRef.current = 1;
        window.setTimeout(() => {
          window.scrollTo({ top: g.top, behavior: "instant" as ScrollBehavior });
          extraRef.current = 0;
          shiftRef.current = n;
        }, 1000);
      }
    }, 300);
    return () => window.clearInterval(id);
  }, [goTo, n]);

  /* ---- mouse wheel / trackpad while hovering the carousel ---- */
  const stickyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      lastWheel.current = performance.now();
      touch();
      // sideways swipe / shift+wheel: translate into carousel movement
      const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (sideways) {
        e.preventDefault();
        window.scrollBy({ top: sideways * 1.4, behavior: "instant" as ScrollBehavior });
      }
      // plain vertical wheel keeps its normal behaviour: it scrolls the pinned section, which flows the cards
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [touch]);

  /* ---- drag to move through the cards ---- */
  const drag = useRef({ x: 0 });
  const onPointerDown = (e: React.PointerEvent) => {
    touch();
    if ((e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    drag.current.x = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    touch();
    if (!dragging.current) return;
    const dx = e.clientX - drag.current.x;
    drag.current.x = e.clientX;
    const perPx = (SCROLL_PER_CARD * window.innerHeight) / (window.innerHeight * 0.6);
    window.scrollBy({ top: -dx * perPx, behavior: "instant" as ScrollBehavior });
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const g = geometry();
    if (g && g.prog > 0.001 && g.prog < 0.999) goTo(Math.round(g.prog * (n - 1)));
  };

  // arrows: move one card from where the carousel really is right now (auto-play may have moved it), wrapping round
  const step = (dir: number) => {
    touch();
    const g = geometry();
    const cur = g ? Math.round(g.prog * (n - 1)) : active;
    goTo(((cur + dir) % n + n) % n);
  };

  const pick = (m: Mode) => {
    touch();
    sfx.resume();
    setMode(m);
    sfx.ui();
    window.setTimeout(() => sfx.card(m), 90); // preview the effect's sound
  };

  const accent = items[active]?.color ?? "#b4f03c";

  /* ---- plain fallback ---- */
  if (simple) {
    return (
      <div id="achievements" role="region" aria-label="Achievements" className="ach-simple">
        <div className="ach-head-simple">
          <SectionTitle kicker="Achievements" white="Small wins," lime="stacked up." className="st-compact" />
        </div>
        <ul className="ach-simple-grid">
          {items.map((it) => (
            <li key={it.id} style={{ ["--c" as string]: it.color }}>
              <span className="ach-simple-icon">{it.icon}</span>
              <h3>{it.title}</h3>
              <p className="ach-simple-event">{it.event}</p>
              <p className="ach-simple-date">{it.date}</p>
              <p>{it.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      id="achievements"
      role="region"
      aria-label="Achievements"
      ref={sectionRef}
      className="ach-section"
      style={{ height: `calc(100vh + ${(n - 1) * SCROLL_PER_CARD * 100}vh)`, ["--accent" as string]: accent }}
    >
      <div
        ref={stickyRef}
        className="ach-sticky"
        onPointerEnter={() => { inside.current = true; touch(); }}
        onPointerLeave={() => { inside.current = false; }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="ach-bg" aria-hidden />
        <div className="ach-aura" aria-hidden />

        <div className="ach-head">
          <SectionTitle kicker="Achievements" white="Small wins," lime="stacked up." className="st-compact" />
        </div>

        <ShowcaseScene items={items} mode={mode} sectionRef={sectionRef} onMotion={onMotion} extraRef={extraRef} shiftRef={shiftRef} active={inView} />

        {/* screen-reader / no-canvas text */}
        <ul className="ach-sr">
          {items.map((it) => (<li key={it.id}>{it.title}: {it.event}, {it.date}. {it.desc}</li>))}
        </ul>

        <button className="ach-arrow ach-arrow-l" aria-label="Previous achievement" onClick={() => { sfx.resume(); sfx.ui(); step(-1); }}><ChevronLeft size={22} /></button>
        <button className="ach-arrow ach-arrow-r" aria-label="Next achievement" onClick={() => { sfx.resume(); sfx.ui(); step(1); }}><ChevronRight size={22} /></button>

        <button
          className="ach-mute"
          aria-pressed={muted}
          onClick={() => { sfx.resume(); setMuted((m) => !m); if (muted) window.setTimeout(() => sfx.ui(), 40); }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{muted ? "Sound off" : "Mute"}</span>
        </button>

        <div className="ach-modes" role="group" aria-label="Card effect">
          {MODES.filter((m) => m !== "stretch").map((m) => (
            <button key={m} className={m === mode ? "is-on" : ""} aria-pressed={m === mode} onClick={() => pick(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div className="ach-count" aria-hidden>
          <b>{String(active + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
        </div>
        <p className="ach-hint" aria-hidden>{auto ? "Auto-play · move the mouse to take control" : "Scroll or drag over the cards"}</p>
      </div>
    </div>
  );
}
