import { ArrowUp } from "lucide-react";

/* Slim, single-row footer. Edit links freely. */
const LINKS = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Arsenal", href: "#arsenal" },
  { label: "Contact", href: "#contact" },
];

export default function FooterClean() {
  return (
    <footer className="fc">
      <span className="fc-copy">© 2026 Kiran Rathod</span>
      <nav className="fc-nav" aria-label="Footer">
        {LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
      </nav>
      <a className="fc-top" href="#home" aria-label="Back to top">Back to top <ArrowUp size={14} /></a>

      <style>{`
        .fc { display: flex; align-items: center; justify-content: space-between; gap: 16px 28px; flex-wrap: wrap;
          padding: 26px max(5vw, 24px) 26px max(5vw, 112px); background: #0a0a0a; border-top: 1px solid rgba(255,255,255,0.07);
          font-size: 13px; color: rgba(255,255,255,0.45); position: relative; z-index: 2; }
        .fc-nav { display: flex; gap: 26px; flex-wrap: wrap; }
        .fc a { color: inherit; text-decoration: none; transition: color .2s; }
        .fc a:hover { color: #b4f03c; }
        .fc-top { display: inline-flex; align-items: center; gap: 6px; }
        @media (max-width: 900px) { .fc { padding-left: max(5vw, 24px); justify-content: center; text-align: center; } }
      `}</style>
    </footer>
  );
}
