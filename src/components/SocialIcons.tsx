"use client";

import React from "react";
import { FaGithub, FaLinkedinIn, FaInstagram } from "react-icons/fa";
import { MdOutlineEmail } from "react-icons/md";
import { ArrowDownToLine } from "lucide-react";
import { sfx } from "@/lib/sfx";
import "./SocialIcons.css";

const socialLinks = [
    { icon: <FaGithub />, label: "GitHub", href: "https://github.com/KiranRathod4" },
    { icon: <FaLinkedinIn />, label: "LinkedIn", href: "https://www.linkedin.com/in/kiranrathod05/" },
    { icon: <MdOutlineEmail />, label: "Email", href: "mailto:kiranrathod4299@gmail.com" },
    { icon: <FaInstagram />, label: "Instagram", href: "https://www.instagram.com/" },
];

/** Fixed rails on both sides: a glass pill of social links (left) and a vertical resume button (right). */
export default function SocialIcons() {
    return (
        <div className="social-icons" data-cursor="icons">
            <nav className="si-rail si-left" aria-label="Social links">
                <span className="si-line" aria-hidden />
                <div className="si-pill">
                    {socialLinks.map((link) => {
                        const external = !link.href.startsWith("mailto");
                        return (
                            <a
                                key={link.label}
                                href={link.href}
                                target={external ? "_blank" : undefined}
                                rel={external ? "noopener noreferrer" : undefined}
                                className="si-btn"
                                aria-label={link.label}
                                onMouseEnter={() => sfx.hover()}
                            >
                                <span className="si-ico">{link.icon}</span>
                                <span className="si-tip" aria-hidden>{link.label}</span>
                            </a>
                        );
                    })}
                </div>
                <span className="si-line" aria-hidden />
            </nav>

            <div className="si-rail si-right">
                <span className="si-line" aria-hidden />
                <a
                    href="/Kiran_Rathod_Resume_2026.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="si-resume"
                    aria-label="Open resume (PDF)"
                    onMouseEnter={() => sfx.hover()}
                >
                    <ArrowDownToLine size={16} strokeWidth={1.8} className="si-resume-ico" />
                    <span className="si-resume-text">RESUME</span>
                </a>
                <span className="si-line" aria-hidden />
            </div>
        </div>
    );
}
