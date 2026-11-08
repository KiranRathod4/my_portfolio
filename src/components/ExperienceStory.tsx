"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import "./ExperienceStory.css";

/* ------------------------------------------------------------------ */
/* Copy: edit freely. Chapter 1 keeps your existing bullet points.     */
/* The bullets for chapters 2 and 3 are placeholders; replace them     */
/* with what you actually did.                                         */
/* ------------------------------------------------------------------ */
const INTRO = {
  kicker: "Experience",
  line1: "From models",
  line2: "to money.",
  sub: "Latest first. Three chapters, one thread: making software you can trust.",
};

/* Listed oldest to newest here; the page shows the newest on top. */
const CHAPTERS = [
  {
    chapter: "Chapter 01",
    theme: "Learning how systems think",
    date: "Sep 2025 — Jan 2026",
    role: "AI / ML Intern",
    company: "Inventeron Technology",
    place: "Bengaluru, India",
    story: "I started on the AI side: building models, and the pipelines that carry them into production.",
    points: [
      "Fine-tuned specialized LLMs for domain tasks, improving accuracy by 40%.",
      "Designed end-to-end MLOps pipelines to automate training, evaluation and deployment with MLflow.",
      "Built FastAPI and Docker microservices to serve model inference in production.",
      "Implemented FAISS vector search for retrieval-augmented generation (RAG).",
    ],
    current: false,
  },
  {
    chapter: "Chapter 02",
    theme: "Learning how systems break",
    date: "Feb 2026 — Jun 2026",
    role: "SDET Intern",
    company: "Test Yantra Software Solutions",
    place: "",
    story: "Then I moved to the other side of the build: finding the ways software fails before customers do.",
    points: [
      "Wrote automated UI and API tests and learned how a dependable test suite is structured.",
      "Worked through the defect lifecycle with engineers, from reproduction to retest.",
      "Practised test design: edge cases, regression and risk-based thinking.",
    ],
    current: false,
  },
  {
    chapter: "Chapter 03",
    theme: "Protecting money in motion",
    date: "2026 — Present",
    role: "SDET",
    company: "Cross-border payments fintech",
    place: "Series B funded startup",
    story: "Now I test the systems that move money across borders, where a missed edge case is a real payment.",
    points: [
      "Own quality for payment flows, from API contracts to end-to-end checks.",
      "Build automation that gives fast, trustworthy signal inside CI.",
      "Work with product and engineering to ship releases that are safe for money movement.",
    ],
    current: true,
  },
];

export default function ExperienceStory() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // reveal each chapter (and light its node) as it reaches the middle of the screen
    const items = Array.from(root.querySelectorAll<HTMLElement>(".xs-item"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -22% 0px", threshold: 0.15 }
    );
    items.forEach((el) => io.observe(el));

    // the thin line fills as you read down the page
    let raf = 0;
    const update = () => {
      raf = 0;
      const track = lineRef.current;
      if (!track) return;
      const r = track.getBoundingClientRect();
      const mid = window.innerHeight * 0.55;
      const p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
      track.style.setProperty("--fill", `${(p * 100).toFixed(2)}%`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div id="experience" ref={rootRef} role="region" aria-label="Experience" className="xs">
      <header className="xs-head">
        <p className="xs-kicker">{INTRO.kicker}</p>
        <h2 className="xs-title"><span>{INTRO.line1}</span> <em>{INTRO.line2}</em></h2>
        <p className="xs-sub">{INTRO.sub}</p>
      </header>

      <a className="xs-next" href="#contact">
        <span>The next chapter could be with you</span> <ArrowRight size={18} />
      </a>

      <div className="xs-track" ref={lineRef}>
        <div className="xs-line" aria-hidden><span /></div>

        {[...CHAPTERS].reverse().map((c, i) => (
          <article key={c.chapter} className={`xs-item ${c.current ? "is-current" : ""}`} style={{ ["--d" as string]: `${i * 0.05}s` }}>
            <div className="xs-node" aria-hidden><i /></div>

            <div className="xs-meta">
              <p className="xs-chapter">{c.chapter}</p>
              <p className="xs-date">{c.date}</p>
              {c.current && <p className="xs-now"><i aria-hidden />Now</p>}
            </div>

            <div className="xs-card">
              <p className="xs-theme">{c.theme}</p>
              <h3 className="xs-role">{c.role}</h3>
              <p className="xs-company">{c.company}{c.place ? <span> · {c.place}</span> : null}</p>
              <p className="xs-story">{c.story}</p>
              <ul className="xs-points">{c.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          </article>
        ))}
      </div>

    </div>
  );
}
