import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Kiran Rathod, SDET · Cloud & DevOps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Cover image for link previews (WhatsApp, LinkedIn, Slack, X ...). */
export default async function Image() {
  const avatar = await readFile(path.join(process.cwd(), "public/images/kiran-avatar.jpg"));
  const src = `data:image/jpeg;base64,${avatar.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "70px 80px", background: "#0a0a0a", backgroundImage: "radial-gradient(900px 500px at 85% 0%, rgba(180,240,60,0.28), rgba(10,10,10,0) 70%)", color: "#f2f5ee", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 26, letterSpacing: 6, color: "#b4f03c" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#b4f03c" }} />
          OPEN TO OPPORTUNITIES
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, display: "flex" }}>Kiran Rathod</div>
            <div style={{ marginTop: 18, fontSize: 50, color: "#b4f03c", display: "flex" }}>SDET · Cloud &amp; DevOps</div>
            <div style={{ marginTop: 26, fontSize: 30, color: "rgba(255,255,255,0.62)", maxWidth: 700, lineHeight: 1.4, display: "flex" }}>I break it and make it better. Testing the systems that move money.</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={230} height={230} alt="" style={{ borderRadius: 115, border: "6px solid #b4f03c", objectFit: "cover" }} />
        </div>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: "rgba(255,255,255,0.4)" }}>KIRANRATHODPORTFOLIO.VERCEL.APP</div>
      </div>
    ),
    { ...size },
  );
}
