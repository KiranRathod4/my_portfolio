"use client";

import { useRef } from "react";
import { Linkedin, Mail, FileText, Send } from "lucide-react";
import "./ContactConnect.css";

/* Edit the copy and links here */
const CONTACT = {
  email: "kiranrathod4299@gmail.com",
  linkedin: "https://www.linkedin.com/in/kiranrathod05/",
  resume: "/Kiran_Rathod_Resume_2026.pdf",
  badge: "SDET · CLOUD & DEVOPS",
  line1: "Let's build",
  line2: "something reliable",
  body: "Got a product that needs solid testing, automation and a deploy pipeline you can trust? Tell me what you're building. I read every message.",
};

export default function ContactConnect() {
  const photoRef = useRef<HTMLDivElement>(null);

  // slight parallax on the photo
  const onMove = (e: React.PointerEvent) => {
    const el = photoRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--px", `${x * 16}px`);
    el.style.setProperty("--py", `${y * 12}px`);
    el.style.setProperty("--rx", `${-y * 4}deg`);
    el.style.setProperty("--ry", `${x * 6}deg`);
  };
  const onLeave = () => {
    const el = photoRef.current;
    if (!el) return;
    ["--px", "--py"].forEach((k) => el.style.setProperty(k, "0px"));
    ["--rx", "--ry"].forEach((k) => el.style.setProperty(k, "0deg"));
  };

  return (
    <div id="contact" role="region" aria-label="Contact" className="cc-section">
      <div className="cc-bg" aria-hidden />
      <div className="cc-grid" aria-hidden />

      <div className="cc-inner">
        {/* ---- photo with hologram effect ---- */}
        <div className="cc-photo-col" onPointerMove={onMove} onPointerLeave={onLeave}>
          <div className="cc-photo" ref={photoRef}>
            <div className="cc-halo" aria-hidden />

            <div className="cc-figure">
              {/* base photo, cooled to a blue tone */}
              <img className="cc-base" src="/images/kiran-cutout.png" alt="Kiran Rathod" draggable={false} />
              <div className="cc-tint" aria-hidden />

              {/* hologram mesh, clipped to the silhouette */}
              <div className="cc-holo" aria-hidden>
                <div className="cc-mesh" />
                <div className="cc-mesh cc-mesh-diag" />
                <div className="cc-scan" />
                <div className="cc-glints" />
              </div>
            </div>

            {/* floating data bits */}
            <div className="cc-bits" aria-hidden>
              {Array.from({ length: 14 }).map((_, i) => (
                <i key={i} style={{ ["--i" as string]: i }} />
              ))}
            </div>
            <span className="cc-tag cc-tag-a" aria-hidden>ID · KR-2026</span>
            <span className="cc-tag cc-tag-b" aria-hidden>STATUS · ONLINE</span>
          </div>
        </div>

        {/* ---- copy ---- */}
        <div className="cc-copy">
          <div className="cc-avail">
            <span className="cc-dot" />
            <span className="cc-avail-label">Open to</span>
            <span className="cc-pill">{CONTACT.badge}</span>
          </div>

          <h2 className="cc-title">
            <span>{CONTACT.line1}</span>
            <span>{CONTACT.line2}</span>
          </h2>

          <p className="cc-body">{CONTACT.body}</p>

          <a className="cc-send" href={`mailto:${CONTACT.email}`}>
            <span>Send message</span>
            <Send size={18} />
          </a>

          <ul className="cc-links">
            <li>
              <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer">
                <i><Linkedin size={16} /></i>LinkedIn
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`}>
                <i><Mail size={16} /></i>Gmail
              </a>
            </li>
            <li>
              <a href={CONTACT.resume} download="Kiran_Rathod_Resume_2026.pdf">
                <i><FileText size={16} /></i>Resume
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
