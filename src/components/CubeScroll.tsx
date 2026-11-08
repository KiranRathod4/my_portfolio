"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import SignatureWrite from "./SignatureWrite";
import "./CubeScroll.css";

const Scene = dynamic(() => import("./CubeScrollScene"), { ssr: false });

/** Copy: edit freely */
const COPY = {
  name: "Kiran Rathod",
  role: "SDET · Cloud & DevOps",
  status: "Open to opportunities",
  intro: "I'm an SDET at a Series B cross-border payments startup, testing the systems that move money.",
  line1: "I break it",
  line2: "and make it better.",
  hint: "Scroll to spin the cube",
};

/**
 * First screen: a short line, your signature, and a puzzle cube that spins as you scroll.
 * The cube stays whole. Skipped (text only) on reduced motion / without WebGL.
 */
export default function CubeScroll() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [cube, setCube] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let gl = false;
    try { gl = !!document.createElement("canvas").getContext("webgl2"); } catch { gl = false; }
    setCube(!reduced && gl);
    if (reduced || !gl) { (window as unknown as { __heroReady?: boolean }).__heroReady = true; window.dispatchEvent(new Event("hero:ready")); }
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "150px 0px" });
    io.observe(el);

    // scroll progress as a CSS variable so text can fade without React re-renders
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      stickyRef.current?.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div id="home" ref={sectionRef} className={`cs-section ${cube ? "" : "cs-flat"}`} role="region" aria-label="Home">
      <div ref={stickyRef} className="cs-sticky" style={{ ["--p" as string]: 0 }}>
        <div className="cs-bg" aria-hidden />
        {cube && <Scene sectionRef={sectionRef} active={inView} />}

        <div className="cs-copy">
          <div className="cs-who">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cs-avatar" src="/images/kiran-avatar.jpg" alt="Kiran Rathod" width={56} height={56} style={{ objectFit: "cover", objectPosition: "50% 22%" }} />
            <div>
              <p className="cs-name">{COPY.name}</p>
              <p className="cs-role">{COPY.role}<span><i aria-hidden />{COPY.status}</span></p>
            </div>
          </div>
          <h1 className="cs-title"><span>{COPY.line1}</span><span className="lime">{COPY.line2}</span></h1>
          <p className="cs-intro">{COPY.intro}</p>
          <SignatureWrite className="cs-sign" />
          {cube && <p className="cs-hint">{COPY.hint}</p>}
        </div>

        {cube && (
          <p className="cs-quote">&ldquo;Life is a puzzle. Professionals don&apos;t panic, they work out how to solve it.&rdquo;</p>
        )}

        {cube && (
          <div className="cs-play" aria-hidden>
            <span>Hover to <i>play</i></span>
            <svg viewBox="0 0 60 50" width="60" height="50" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 6 C 30 0, 56 14, 40 38" /><path d="M40 38 L 32 30 M40 38 L 49 33" /></svg>
          </div>
        )}
      </div>
    </div>
  );
}
