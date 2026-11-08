"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { sfx } from "@/lib/sfx";
import "./WhatIDoPillars.css";

/* ------------------------------------------------------------------ */
/* Copy: edit freely                                                   */
/* ------------------------------------------------------------------ */
const PILLARS = [
  {
    id: "sdet", num: "01", color: "#b4f03c",
    label: "SDET", kicker: "Quality engineering",
    tagline: "Break it before users do.",
    body: "I build test automation people actually trust: API and UI suites, regression gates and fast feedback inside CI.",
    tags: ["Playwright", "Selenium", "PyTest", "k6", "Postman"],
  },
  {
    id: "devops", num: "02", color: "#22d3ee",
    label: "DevOps", kicker: "Cloud & delivery",
    tagline: "Ship it, repeatably.",
    body: "Pipelines, infrastructure as code and observability, so every release is boring in the best way.",
    tags: ["AWS", "Docker", "Terraform", "Jenkins", "Grafana"],
  },
  {
    id: "gym", num: "03", color: "#ffb02e",
    label: "Gym", kicker: "Strength & discipline",
    tagline: "Discipline compounds.",
    body: "Lifting taught me what testing does: show up, track the work, and small reps add up to big results.",
    tags: ["Strength", "Consistency", "Routine", "Recovery"],
  },
  {
    id: "content", num: "04", color: "#f472b6",
    label: "Content", kicker: "Create & share",
    tagline: "Share what I learn.",
    body: "I turn what I learn into posts and short videos, from test automation tips to behind-the-scenes of my builds.",
    tags: ["Short videos", "Write-ups", "Tutorials", "Community"],
  },
] as const;

type Pillar = (typeof PILLARS)[number];

/* ------------------------------------------------------------------ */
/* Animated mini-scenes (they are mounted when a panel opens, so they replay each time) */
/* ------------------------------------------------------------------ */
function SdetScene() {
  const lines = ["login flow", "payment API contract", "checkout regression", "load profile (k6)"];
  return (
    <div className="wp-term" aria-hidden>
      <div className="wp-term-bar"><i /><i /><i /><span>playwright · ci</span></div>
      <p className="wp-term-cmd">$ npx playwright test</p>
      {lines.map((l, i) => (
        <p key={l} className="wp-term-line" style={{ animationDelay: `${0.5 + i * 0.5}s` }}>
          <b>✓</b> {l}
        </p>
      ))}
      <div className="wp-term-bar2"><span style={{ animationDelay: "0.4s" }} /></div>
      <p className="wp-term-done" style={{ animationDelay: "2.6s" }}>all checks passed</p>
    </div>
  );
}

function DevopsScene() {
  const nodes = ["Commit", "Build", "Test", "Deploy"];
  return (
    <div className="wp-pipe" aria-hidden>
      <div className="wp-pipe-nodes">
        <div className="wp-pipe-line"><span /></div>
        {nodes.map((n, i) => (
          <div key={n} className="wp-pipe-node" style={{ animationDelay: `${i * 0.9}s` }}>
            <i />
            <span>{n}</span>
          </div>
        ))}
      </div>
      <p className="wp-pipe-cap">push → green → live</p>
    </div>
  );
}

function GymScene() {
  return (
    <div className="wp-gym" aria-hidden>
      <svg viewBox="0 0 320 170" className="wp-gym-svg">
        <ellipse className="wp-gym-shadow" cx="160" cy="150" rx="120" ry="9" />
        <g className="wp-gym-lift">
          <rect x="20" y="78" width="280" height="9" rx="4.5" className="bar" />
          {/* plates, left */}
          <rect x="40" y="38" width="16" height="89" rx="5" className="plate p1" />
          <rect x="58" y="48" width="14" height="69" rx="5" className="plate p2" />
          <rect x="74" y="60" width="12" height="45" rx="4" className="plate p3" />
          {/* plates, right */}
          <rect x="264" y="38" width="16" height="89" rx="5" className="plate p1" />
          <rect x="248" y="48" width="14" height="69" rx="5" className="plate p2" />
          <rect x="234" y="60" width="12" height="45" rx="4" className="plate p3" />
          <rect x="92" y="73" width="8" height="19" rx="3" className="collar" />
          <rect x="220" y="73" width="8" height="19" rx="3" className="collar" />
        </g>
      </svg>
      <p className="wp-gym-cap">Show up. Add weight. Repeat.</p>
    </div>
  );
}

function ContentScene() {
  return (
    <div className="wp-wave" aria-hidden>
      <div className="wp-wave-top"><span className="rec"><i />REC</span><span className="wp-wave-play"><Play size={14} fill="currentColor" /></span></div>
      <div className="wp-wave-bars">
        {Array.from({ length: 26 }).map((_, i) => (
          <i key={i} style={{ ["--i" as string]: i }} />
        ))}
      </div>
      <div className="wp-wave-track"><span /></div>
    </div>
  );
}

function Scene({ id }: { id: Pillar["id"] }) {
  if (id === "sdet") return <SdetScene />;
  if (id === "devops") return <DevopsScene />;
  if (id === "gym") return <GymScene />;
  return <ContentScene />;
}

/* ------------------------------------------------------------------ */
export default function WhatIDoPillars() {
  const [open, setOpen] = useState(0);
  const [seen, setSeen] = useState(false);
  const rootRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = (i: number) => {
    setOpen((cur) => (cur === i ? -1 : i));
    sfx.ui();
  };

  return (
    <div id="what-i-do" role="region" aria-label="What I do" className="wp-section">
      <div className="wp-wrap">
        <SectionTitle kicker="What I do" white="Four sides," lime="one standard." />

        <ul ref={rootRef} className={`wp-list ${seen ? "in" : ""}`}>
          {PILLARS.map((p, i) => {
            const isOpen = i === open;
            return (
              <li key={p.id} className={`wp-item ${isOpen ? "is-open" : ""}`} style={{ ["--a" as string]: p.color, ["--d" as string]: `${i * 0.09}s` }}>
                <button type="button" className="wp-head" aria-expanded={isOpen} aria-controls={`wp-${p.id}`} onClick={() => toggle(i)}>
                  <span className="wp-num">{p.num}</span>
                  <span className="wp-name">{p.label}</span>
                  <span className="wp-tag">{p.tagline}</span>
                  <span className="wp-plus" aria-hidden />
                </button>
                <div id={`wp-${p.id}`} className="wp-panel" role="region" aria-label={p.label}>
                  <div className="wp-panel-in">
                    <div className="wp-cols">
                      <div>
                        <p className="wp-kicker">{p.kicker}</p>
                        <p className="wp-tagline">{p.tagline}</p>
                        <p className="wp-text">{p.body}</p>
                        <ul className="wp-tags">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                      </div>
                      <div className="wp-scene"><div className="wp-scene-box">{isOpen && <Scene id={p.id} />}</div></div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
