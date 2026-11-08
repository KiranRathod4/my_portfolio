"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Dumbbell, Clapperboard } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import PaymentRoutes from "@/components/PaymentRoutes";
import "./About.css";

/* Copy: edit freely */
const ABOUT = {
    now: "SDET at a cross-border payments startup (Series B).",
    nowSub: "Testing the systems that move money.",
    off: "Lifting heavy and making content.",
    facts: [
        { k: "Education", v: "VTU, Belagavi", sub: "Visvesvaraya Technological University" },
        { k: "CGPA", v: "8.3", sub: "Out of 10" },
        { k: "Experience", v: "2 internships", sub: "Then SDET at a fintech startup" },
        { k: "Focus", v: "Test · Cloud · AI", sub: "Automation, DevOps and agents" },
    ],
};

export default function About() {
    const ref = useRef<HTMLDivElement>(null);
    const [seen, setSeen] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div id="about" role="region" aria-label="About me" className="about-money">
            <div className="about-money-flow"><PaymentRoutes /></div>
            <div className="about-money-fade" aria-hidden />

            <div className="about-money-inner">
                <SectionTitle kicker="About me" white="The person behind" lime="the tests." />

                <div ref={ref} className={`ab-grid ${seen ? "in" : ""}`}>
                    {/* photo: halftone portrait with scan band, cursor light and neon frame on hover */}
                    <figure
                        className="ab-tile ab-photo"
                        style={{ ["--i" as string]: 0 }}
                        onPointerMove={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                            e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                        }}
                    >
                        <Image src="/images/kiran-halftone.jpg" alt="Halftone portrait of Kiran Rathod" fill sizes="(max-width: 900px) 90vw, 380px" className="ab-photo-img" style={{ objectFit: "cover" }} />
                        <span className="ab-p-scan" aria-hidden />
                        <span className="ab-p-spot" aria-hidden />
                        <span className="ab-p-neon" aria-hidden />
                    </figure>

                    {/* bio */}
                    <div className="ab-tile ab-bio" style={{ ["--i" as string]: 1 }}>
                        <p className="ab-label">Who I am</p>
                        <p className="ab-big">
                            I&apos;m an <b>SDET</b> working in <b>fintech</b>. I build test automation, pipelines and cloud
                            infrastructure so every release of a payment flow is <b>verified</b> before it reaches production.
                        </p>
                        <p className="ab-small">Because when money is moving, &ldquo;it works on my machine&rdquo; isn&apos;t good enough.</p>
                    </div>

                    {/* right now */}
                    <div className="ab-tile ab-now" style={{ ["--i" as string]: 2 }}>
                        <p className="ab-label"><i aria-hidden />Right now</p>
                        <p className="ab-mid">{ABOUT.now}</p>
                        <p className="ab-small">{ABOUT.nowSub}</p>
                    </div>

                    {/* off the clock */}
                    <div className="ab-tile ab-off" style={{ ["--i" as string]: 3 }}>
                        <p className="ab-label">Off the clock</p>
                        <p className="ab-mid">{ABOUT.off}</p>
                        <div className="ab-icons" aria-hidden>
                            <span><Dumbbell size={18} strokeWidth={1.6} /></span>
                            <span><Clapperboard size={18} strokeWidth={1.6} /></span>
                        </div>
                    </div>

                    {/* facts */}
                    <ul className="ab-tile ab-pr" style={{ ["--i" as string]: 4 }}>
                        {ABOUT.facts.map((f) => (
                            <li key={f.k}>
                                <span className="ab-fk">{f.k}</span>
                                <h4>{f.v}</h4>
                                <p>{f.sub}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
