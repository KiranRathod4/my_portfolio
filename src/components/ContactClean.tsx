"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import "./ContactClean.css";

/* Copy and links: edit freely */
const CONTACT = {
  email: "kiranrathod4299@gmail.com",
  resume: "/Kiran_Rathod_Resume_2026.pdf",
  status: "Open to SDET · Cloud & DevOps roles",
  line1: "Let's build",
  line2: "something reliable.",
  body: "Got a product that needs solid testing, automation and a deploy pipeline you can trust? Tell me what you're building. I read every message.",
};

export default function ContactClean() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div id="contact" ref={ref} role="region" aria-label="Contact" className={`cc2 ${seen ? "in" : ""}`}>
      <div className="cc2-inner">
        <p className="cc2-status" style={{ ["--i" as string]: 0 }}>
          <i aria-hidden />{CONTACT.status}
        </p>

        <h2 className="cc2-title" style={{ ["--i" as string]: 2 }}>
          <span>{CONTACT.line1}</span>
          <span className="lime">{CONTACT.line2}</span>
        </h2>

        <p className="cc2-body" style={{ ["--i" as string]: 3 }}>{CONTACT.body}</p>

        <div className="cc2-actions" style={{ ["--i" as string]: 4 }}>
          <a className="cc2-btn primary" href={`mailto:${CONTACT.email}`}>
            Send message <ArrowUpRight size={18} />
          </a>
          <a className="cc2-btn" href={CONTACT.resume} download="Kiran_Rathod_Resume_2026.pdf">
            <Download size={16} /> Resume
          </a>
        </div>

        <a className="cc2-mail" href={`mailto:${CONTACT.email}`} style={{ ["--i" as string]: 5 }}>{CONTACT.email}</a>
      </div>
    </div>
  );
}
