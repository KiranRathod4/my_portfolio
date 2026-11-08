"use client";

import { useEffect, useRef, useState } from "react";
import { prefetchArsenal } from "@/components/ClientOnlyComponents";
import "./CubeGate.css";

/**
 * Site intro: the name, with a quick stream of greetings in different languages
 * underneath, while the page loads. When the page is ready (and the greetings have
 * played at least once) the curtain slides up and the site is revealed.
 * Skipped when the visitor prefers reduced motion.
 */
const GREETINGS: { text: string; code: string }[] = [
  { text: "Hello", code: "en" }, { text: "नमस्ते", code: "hi" }, { text: "ನಮಸ್ಕಾರ", code: "kn" }, { text: "வணக்கம்", code: "ta" },
  { text: "నమస్కారం", code: "te" }, { text: "নমস্কার", code: "bn" }, { text: "नमस्कार", code: "mr" }, { text: "Hola", code: "es" },
];
const STEP = 280;        // ms per greeting while silent
const GAP = 150;         // ms of quiet between two spoken greetings, so they never run into each other
const MIN_TIME = 2600;   // never flash by
const MAX_TIME = 14000;  // never hang

// things that should already be in place when the curtain lifts
const IMAGES = [
  "/images/kiran-avatar.jpg", "/images/kiran-signature.png", "/images/kiran-halftone.jpg",
  ...["ai-agents", "airflow", "aws", "docker", "dvc", "fastapi", "git", "github", "grafana", "huggingface", "jenkins", "jira", "k6", "kubeflow", "linear", "linux", "mysql", "playwright-mcp", "playwright", "postman", "powerbi", "prometheus", "pytest", "python", "selenium", "terraform"].map((n) => `/logos/${n}.svg`),
];
type Ctx = AudioContext;
const AC = () => (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
const preload = (src: string) => new Promise<void>((res) => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = src; });

export default function CubeGate() {
  const [phase, setPhase] = useState<"gate" | "leaving" | "done">("gate");
  const [i, setI] = useState(0);
  const [sound, setSound] = useState(false);          // browser lets us play audio
  const start = useRef(0);
  const ctxRef = useRef<Ctx | null>(null);
  const bufs = useRef<Record<string, AudioBuffer>>({});
  const passDone = useRef(false);                     // the spoken pass has finished

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPhase("done"); return; }
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    window.scrollTo(0, 0);
    start.current = performance.now();
    return () => { root.style.overflow = prev; };
  }, []);

  // voices: decode the short clips, and start playing as soon as the browser allows sound
  useEffect(() => {
    if (phase !== "gate") return;
    let dead = false;
    const Ctor = AC();
    if (!Ctor) return;
    const ctx = new Ctor();
    ctxRef.current = ctx;
    GREETINGS.forEach(async (g) => {
      try {
        const buf = await (await fetch(`/audio/greet/${g.code}.m4a`)).arrayBuffer();
        bufs.current[g.code] = await ctx.decodeAudioData(buf);
      } catch { /* a missing clip is simply silent */ }
    });
    const unlocked = () => {
      if (dead || ctx.state !== "running") return;
      passDone.current = false; setSound(true);
    };
    const tryUnlock = () => { void ctx.resume().then(unlocked, () => undefined); };
    ctx.addEventListener("statechange", unlocked);
    if (ctx.state === "running") unlocked();
    const evs = ["pointerdown", "keydown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, tryUnlock, { once: true }));
    return () => { dead = true; evs.forEach((e) => window.removeEventListener(e, tryUnlock)); ctx.removeEventListener("statechange", unlocked); };
  }, [phase]);

  // spoken pass: one greeting at a time. The next word appears only when the previous one has finished.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (phase !== "gate" || !sound || !ctx) return;
    let dead = false;
    const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
    (async () => {
      for (let n = 0; n < GREETINGS.length && !dead; n++) {
        // wait (briefly) for this clip to finish decoding
        for (let k = 0; k < 40 && !bufs.current[GREETINGS[n].code] && !dead; k++) await wait(50);
        if (dead) return;
        setI(n);
        const buf = bufs.current[GREETINGS[n].code];
        if (!buf) { await wait(STEP); continue; }
        const src = ctx.createBufferSource(); const g = ctx.createGain();
        g.gain.value = 0.95; src.buffer = buf; src.connect(g); g.connect(ctx.destination); src.start();
        await wait(buf.duration * 1000 + GAP);
      }
      if (!dead) passDone.current = true;
    })();
    return () => { dead = true; };
  }, [sound, phase]);

  // silent cycle (before sound is allowed, and after the spoken pass)
  const [spoken, setSpoken] = useState(false);
  useEffect(() => {
    if (!sound) return;
    const id = window.setInterval(() => { if (passDone.current) setSpoken(true); }, 100);
    return () => window.clearInterval(id);
  }, [sound]);
  useEffect(() => {
    if (phase !== "gate" || (sound && !spoken)) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % GREETINGS.length), STEP);
    return () => window.clearInterval(id);
  }, [phase, sound, spoken]);

  // leave once the page is loaded
  useEffect(() => {
    if (phase !== "gate") return;
    const flags = { load: document.readyState === "complete", assets: false, hero: !!(window as unknown as { __heroReady?: boolean }).__heroReady, fonts: false };
    let t: number | undefined;
    const tryLeave = () => {
      const waited = performance.now() - start.current;
      const voiced = !ctxRef.current || ctxRef.current.state !== "running" || passDone.current;
      const ready = flags.load && flags.assets && flags.hero && flags.fonts && voiced && waited >= MIN_TIME;
      if (ready || waited >= MAX_TIME) setPhase("leaving");
      else t = window.setTimeout(tryLeave, 80);
    };
    const onLoad = () => { flags.load = true; };
    const onHero = () => { flags.hero = true; };
    window.addEventListener("load", onLoad);
    window.addEventListener("hero:ready", onHero);
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    (fonts ? fonts.ready : Promise.resolve()).then(() => { flags.fonts = true; }, () => { flags.fonts = true; });
    Promise.all([prefetchArsenal().catch(() => undefined), ...IMAGES.map(preload)]).then(() => { flags.assets = true; });
    t = window.setTimeout(tryLeave, 80);
    return () => { window.removeEventListener("load", onLoad); window.removeEventListener("hero:ready", onHero); if (t) window.clearTimeout(t); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const id = window.setTimeout(() => setPhase("done"), 1000);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    document.documentElement.style.overflow = "";
    window.dispatchEvent(new Event("gate:done"));   // lets the hero signature start writing now
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div className={`cg ${phase === "leaving" ? "is-leaving" : ""}`} role="status" aria-label="Loading">
      <div className="cg-inner">
        <h1 className="cg-name" aria-label="Kiran Rathod">
          <span>Kiran</span> <em>Rathod</em>
        </h1>
        <p className="cg-greet" aria-hidden>
          <span key={i}>{GREETINGS[i].text}</span>
        </p>
      </div>
      {!sound && <p className="cg-sound" aria-hidden>Click anywhere for sound</p>}
      <div className="cg-bar" aria-hidden><i style={{ animationDuration: `${MIN_TIME}ms` }} /></div>
    </div>
  );
}
