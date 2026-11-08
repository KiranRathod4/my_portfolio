"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { sfx } from "@/lib/sfx";

const navLinks = [
    { name: "Home", href: "#home" },
    { name: "About", href: "#about" },
    { name: "What I Do", href: "#what-i-do" },
    { name: "Arsenal", href: "#arsenal" },
    { name: "Experience", href: "#experience" },
    { name: "Achievements", href: "#achievements" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
];

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Eased scroll to a y position; duration grows with distance so long hops still feel smooth. */
let scrollRaf = 0;
function glideTo(y: number, onDone?: () => void) {
    cancelAnimationFrame(scrollRaf);
    const root = document.documentElement;
    const from = window.scrollY;
    const dist = y - from;
    if (Math.abs(dist) < 2) { onDone?.(); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo(0, y); onDone?.(); return; }
    const dur = Math.min(1600, Math.max(650, Math.abs(dist) * 0.32));
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";          // the page has CSS smooth scrolling; don't fight it
    const t0 = performance.now();
    const stop = () => { cancelAnimationFrame(scrollRaf); root.style.scrollBehavior = prev; cleanup(); onDone?.(); };
    const cleanup = () => { window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", stop); };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, from + dist * easeInOut(k));
        if (k < 1) scrollRaf = requestAnimationFrame(step);
        else { root.style.scrollBehavior = prev; cleanup(); onDone?.(); }
    };
    scrollRaf = requestAnimationFrame(step);
}

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [trans, setTrans] = useState<number | null>(null);   // section being travelled to (nav click)
    const [toast, setToast] = useState<number | null>(null);    // section just scrolled into (mouse / touch scroll)
    const prevActive = useRef(0);
    const gliding = useRef(false);
    const [pill, setPill] = useState({ x: 0, w: 0, ready: false });
    const barRef = useRef<HTMLSpanElement>(null);
    const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const listRef = useRef<HTMLDivElement>(null);

    // scroll state: blurred bar, progress line, which section is current
    useEffect(() => {
        let raf = 0;
        const update = () => {
            raf = 0;
            const y = window.scrollY;
            setIsScrolled(y > 50);
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
            let cur = 0;
            const probe = window.innerHeight * 0.4;
            navLinks.forEach((l, i) => {
                const el = document.getElementById(l.href.slice(1));
                if (el && el.getBoundingClientRect().top <= probe) cur = i;
            });
            setActive(cur);
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
    }, []);

    // scrolling by hand into another section: flash its name briefly (after the scroll settles for a moment)
    useEffect(() => {
        if (gliding.current || active === prevActive.current) return;
        const from = prevActive.current;
        const t = window.setTimeout(() => {
            prevActive.current = active;
            if (gliding.current || window.scrollY < 120 && active === 0 && from === 0) return;
            setToast(active);
            window.setTimeout(() => setToast((c) => (c === active ? null : c)), 1000);
        }, 140);
        return () => window.clearTimeout(t);
    }, [active]);

    // sliding highlight behind the active link
    const place = useCallback(() => {
        const el = linkRefs.current[active];
        const list = listRef.current;
        if (!el || !list) return;
        setPill({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
    }, [active]);
    useLayoutEffect(() => { place(); }, [place]);
    useEffect(() => { window.addEventListener("resize", place); return () => window.removeEventListener("resize", place); }, [place]);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        sfx.resume();
        sfx.ui();
        const elem = document.getElementById(href.slice(1));
        if (elem) {
            const idx = navLinks.findIndex((l) => l.href === href);
            const y = Math.max(0, elem.getBoundingClientRect().top + window.scrollY);
            if (Math.abs(y - window.scrollY) > 400) setTrans(idx);
            gliding.current = true;
            glideTo(y, () => window.setTimeout(() => { setTrans(null); gliding.current = false; prevActive.current = idx; }, 160));
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <>
        <nav
            className={`fixed top-0 left-0 right-0 z-[100] transition-[background,border-color,backdrop-filter] duration-500 flex items-center h-[70px] border-b ${isScrolled
                ? "bg-[#0a0a0a]/55 backdrop-blur-xl border-white/[0.07]"
                : "bg-transparent border-transparent"
                }`}
        >
            {/* page progress */}
            <span ref={barRef} aria-hidden className="absolute left-0 bottom-[-1px] h-[2px] w-full origin-left bg-[#b4f03c] shadow-[0_0_10px_rgba(180,240,60,0.7)]" style={{ transform: "scaleX(0)" }} />

            <div className="w-full px-[5vw] flex items-center justify-between">
                {/* Logo */}
                <a
                    href="#home"
                    onClick={(e) => scrollToSection(e, "#home")}
                    className="text-[1.3rem] font-space font-[800] text-white tracking-tighter"
                >
                    KIRAN<span className="text-[#b4f03c]">.</span>
                </a>

                {/* Desktop Nav Links */}
                <div ref={listRef} className="hidden lg:flex relative items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur-md">
                    <span
                        aria-hidden
                        className="absolute top-1 bottom-1 rounded-full border border-[#b4f03c]/35 bg-[#b4f03c]/[0.12] shadow-[0_0_18px_rgba(180,240,60,0.15)] transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,0.9,0.24,1)]"
                        style={{ left: 0, width: pill.w, transform: `translateX(${pill.x}px)`, opacity: pill.ready ? 1 : 0 }}
                    />
                    {navLinks.map((link, i) => (
                        <a
                            key={link.name}
                            ref={(el) => { linkRefs.current[i] = el; }}
                            href={link.href}
                            onClick={(e) => scrollToSection(e, link.href)}
                            aria-current={i === active ? "true" : undefined}
                            style={{ padding: "7px 16px", display: "block" }}
                            className={`relative z-[1] rounded-full text-[0.86rem] font-medium tracking-[0.01em] transition-colors duration-300 ${i === active ? "text-white" : "text-white/60 hover:text-white"}`}
                        >
                            {link.name}
                        </a>
                    ))}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="lg:hidden text-white p-2"
                    onClick={() => { sfx.resume(); sfx.ui(); setIsMobileMenuOpen((v) => !v); }}
                    aria-label="Toggle Menu"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

        </nav>
            {/* section-to-section transition: a soft veil with the name of the section we are travelling to */}
        <AnimatePresence>
            {trans !== null && (
                <motion.div
                    key="veil"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    aria-hidden
                    className="pointer-events-none fixed inset-0 z-[95] flex flex-col items-center justify-center bg-[#0a0a0a]/60 backdrop-blur-[3px]"
                >
                    <span className="font-mono text-[11px] tracking-[0.34em] text-[#b4f03c]">{String(trans + 1).padStart(2, "0")} / {String(navLinks.length).padStart(2, "0")}</span>
                    <span className="mt-3 font-space text-[clamp(34px,6vw,76px)] font-semibold tracking-[-0.04em] text-white">{navLinks[trans].name}</span>
                    <span className="mt-6 h-[2px] w-40 overflow-hidden rounded bg-white/10"><i className="block h-full w-full origin-left animate-[nav-line_1.1s_ease-in-out_infinite] bg-[#b4f03c]" /></span>
                </motion.div>
            )}
        </AnimatePresence>

        {/* lighter version of the same transition while scrolling by hand */}
        <AnimatePresence>
            {toast !== null && trans === null && (
                <motion.div
                    key={`toast-${toast}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    aria-hidden
                    className="pointer-events-none fixed inset-0 z-[94] flex flex-col items-center justify-center bg-[#0a0a0a]/35"
                >
                    <span className="font-mono text-[11px] tracking-[0.34em] text-[#b4f03c]">{String(toast + 1).padStart(2, "0")} / {String(navLinks.length).padStart(2, "0")}</span>
                    <span className="mt-2 font-space text-[clamp(30px,5vw,60px)] font-semibold tracking-[-0.04em] text-white">{navLinks[toast].name}</span>
                </motion.div>
            )}
        </AnimatePresence>
        {/* Mobile Menu (outside the blurred nav so it can cover the whole screen) */}
        <AnimatePresence>
            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{ gap: 26 }}
                        className="fixed inset-0 z-[99] bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col items-center justify-center"
                >
                    {navLinks.map((link, i) => (
                        <a
                            key={link.name}
                            href={link.href}
                            onClick={(e) => scrollToSection(e, link.href)}
                            className={`text-2xl font-semibold transition-colors ${i === active ? "text-[#b4f03c]" : "text-white/70 hover:text-white"}`}
                        >
                            {link.name}
                        </a>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
}
