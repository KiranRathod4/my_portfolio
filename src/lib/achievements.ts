export type Achievement = {
  id: number;
  icon: string;   // emoji drawn on the card
  title: string;
  event: string;
  date: string;
  desc: string;
  color: string;  // accent colour of the card
};

/**
 * Achievements shown in the carousel. Add, remove or reorder freely:
 * the carousel and its scroll length adapt to however many you list.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 1,
    icon: "🥇",
    title: "Winner",
    event: "Vencer Hackathon, AITM Belagavi",
    date: "April 2025",
    desc: "Secured first place out of 20+ teams by building an innovative AI-driven educational platform.",
    color: "#f5c04a",
  },
  {
    id: 2,
    icon: "🥉",
    title: "Winner",
    event: "Code Prahari, SGBIT Belagavi",
    date: "March 2024",
    desc: "Recognized among 100+ participants for developing a real-time anomaly detection system.",
    color: "#e8873a",
  },
  {
    id: 3,
    icon: "🎗️",
    title: "Event Lead",
    event: "Yukti-2K25 National Technical Fest",
    date: "2025",
    desc: "Led a core team of 15 members to organize and execute a national-level technical symposium.",
    color: "#a78bfa",
  },
];
