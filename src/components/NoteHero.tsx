"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { DM_Serif_Display, Hind, Allura } from "next/font/google";
import "./NoteHero.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--note-serif" });
const hind = Hind({ subsets: ["latin", "devanagari"], weight: ["400", "500", "600"], variable: "--note-sans" });
const script = Allura({ subsets: ["latin"], weight: "400", variable: "--note-script" });

/* ------------------------------------------------------------------ */
/* Content: edit these to change the copy on the note                  */
/* ------------------------------------------------------------------ */
const CONTENT = {
  serial: "KR2026",
  eyebrow: "SDET · Cloud & DevOps · Fintech",
  name: "Kiran Rathod",
  hindi: "मैं वादा करता हूँ",
  promise:
    "I promise that the systems behind how money moves are tested, automated and deployed right: from first commit to production, every release.",
  caption: "Issued by Kiran Rathod. Specimen, not legal tender.",
  microtext: "KIRAN RATHOD TESTS HOW MONEY MOVES · FINTECH · SDET · CLOUD · DEVOPS · ",
};

const TABS = [
  { label: "About", href: "#about", color: "#3f9c86" },
  { label: "What I Do", href: "#what-i-do", color: "#5b4b9a" },
  { label: "Arsenal", href: "#arsenal", color: "#3b5fa8" },
  { label: "Experience", href: "#experience", color: "#a14a7a" },
  { label: "Achievements", href: "#achievements", color: "#b8862f" },
  { label: "Projects", href: "#projects", color: "#c0612b" },
  { label: "Contact", href: "#contact", color: "#2f7d8c" },
];

/* Hypotrochoid: the maths behind banknote guilloche patterns */
function guilloche(R: number, r: number, d: number, cx: number, cy: number, scale: number, steps = 1800) {
  const turns = r / gcd(R, r);
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    pts.push(`${i === 0 ? "M" : "L"}${(cx + x * scale).toFixed(1)} ${(cy + y * scale).toFixed(1)}`);
  }
  return pts.join("");
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function goTo(e: React.MouseEvent, href: string) {
  e.preventDefault();
  document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
}

export default function NoteHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [lit, setLit] = useState(false);

  const art = useMemo(
    () => ({
      big: guilloche(97, 41, 63, 400, 300, 2.2),
      rosette: guilloche(60, 7, 53, 200, 200, 1.7, 2400),
    }),
    []
  );

  const onMove = (e: React.PointerEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const px = (e.clientX - b.left) / b.width;
    const py = (e.clientY - b.top) / b.height;
    el.style.setProperty("--mx", String(px));
    el.style.setProperty("--my", String(py));
    el.style.setProperty("--rx", `${(0.5 - py) * 5}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 7}deg`);
  };
  const onLeave = () => {
    const el = wrapRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <section
      id="home"
      className={`note-hero ${serif.variable} ${hind.variable} ${script.variable}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="note-stage" ref={wrapRef}>
        <div className={`note-flip ${flipped ? "is-flipped" : ""} ${lit ? "is-lit" : ""}`}>
          {/* ------------------------- FRONT ------------------------- */}
          <article className="note note-front" aria-hidden={flipped}>
            <div className="note-guilloche" aria-hidden>
              <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                <path d={art.big} />
              </svg>
            </div>
            <div className="note-frame" aria-hidden />
            <div className="note-micro note-micro-top" aria-hidden>{CONTENT.microtext.repeat(6)}</div>
            <div className="note-micro note-micro-bottom" aria-hidden>{CONTENT.microtext.repeat(6)}</div>
            <div className="note-thread" aria-hidden><span>{"SDET · CLOUD · DEVOPS · ".repeat(8)}</span></div>

            <div className="note-serial">{CONTENT.serial}</div>
            <div className="note-denom" aria-hidden>
              <span className="note-denom-mark">₹</span>
              <span className="note-denom-sub">Series 2026<br />श्रृंखला 2026</span>
            </div>
            <div className="note-serial-v" aria-hidden>{CONTENT.serial}</div>

            <figure className="note-portrait">
              <div className="note-portrait-oval">
                <Image
                  src="/images/kiran-note.jpg"
                  alt="Portrait of Kiran Rathod"
                  fill
                  priority
                  sizes="(max-width: 800px) 60vw, 420px"
                  style={{ objectFit: "cover", objectPosition: "50% 30%" }}
                />
              </div>
              <span className="note-stamp">Specimen</span>
            </figure>

            <div className="note-copy">
              <p className="note-eyebrow">{CONTENT.eyebrow}</p>
              <h1 className="note-name">{CONTENT.name}</h1>
              <p className="note-hindi">{CONTENT.hindi}</p>
              <p className="note-promise">{CONTENT.promise}</p>

              <div className="note-sign">
                <span className="note-signature">{CONTENT.name}</span>
                <span className="note-caption">{CONTENT.caption}</span>
              </div>

              <div className="note-actions">
                <button
                  type="button"
                  className="note-btn"
                  aria-pressed={lit}
                  onPointerDown={() => setLit(true)}
                  onPointerUp={() => setLit(false)}
                  onPointerLeave={() => setLit(false)}
                  onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setLit(true)}
                  onKeyUp={() => setLit(false)}
                >
                  Hold to light
                </button>
                <button type="button" className="note-btn note-btn-solid" onClick={() => setFlipped(true)}>
                  Turn over
                </button>
              </div>
            </div>

            <div className="note-hologram" aria-hidden><span>₹</span></div>
          </article>

          {/* ------------------------- BACK -------------------------- */}
          <article className="note note-back" aria-hidden={!flipped}>
            <div className="note-guilloche note-guilloche-back" aria-hidden>
              <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
                <path d={art.rosette} />
              </svg>
            </div>
            <div className="note-frame note-frame-back" aria-hidden />
            <div className="note-back-copy">
              <p className="note-eyebrow note-eyebrow-back">Terms of this promise</p>
              <h2 className="note-back-title">Where to find the work</h2>
              <ul className="note-back-links">
                {TABS.map((t) => (
                  <li key={t.href}>
                    <a href={t.href} onClick={(e) => goTo(e, t.href)} tabIndex={flipped ? 0 : -1}>
                      <i style={{ background: t.color }} />
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="note-btn note-btn-light"
                onClick={() => setFlipped(false)}
                tabIndex={flipped ? 0 : -1}
              >
                Turn back
              </button>
            </div>
          </article>
        </div>

        {/* Side tabs, like the edge of a stack of notes */}
        <nav className="note-tabs" aria-label="Sections">
          {TABS.map((t) => (
            <a key={t.href} href={t.href} onClick={(e) => goTo(e, t.href)} style={{ ["--tab" as string]: t.color }}>
              <span>{t.label}</span>
            </a>
          ))}
        </nav>
      </div>

      <p className="note-scroll" aria-hidden>Scroll to continue ↓</p>
    </section>
  );
}
