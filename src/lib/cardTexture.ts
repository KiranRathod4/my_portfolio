import * as THREE from "three";
import type { Achievement } from "./achievements";

export const CARD_W = 864;
export const CARD_H = 1120;

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draws one achievement card in an editorial style: left-aligned type, a huge outlined
 * rank numeral as the background, and one accent colour used as light (corner glow, edge, event line).
 * Returned as a three.js texture.
 */
export function drawCardTexture(item: Achievement, index: number, total: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = CARD_W; c.height = CARD_H;
  const ctx = c.getContext("2d")!;
  const R = 52;
  const accent = item.color;
  const PAD = 76;
  const mono = "ui-monospace, Menlo, Consolas, monospace";
  const sans = "ui-sans-serif, 'SF Pro Display', Inter, system-ui, sans-serif";

  ctx.beginPath();
  ctx.roundRect(0, 0, CARD_W, CARD_H, R);
  ctx.clip();

  // surface: near-black, lit by a coloured glow from the top-right and a faint one from the bottom-left
  const base = ctx.createLinearGradient(0, 0, 0, CARD_H);
  base.addColorStop(0, "#0f1213");
  base.addColorStop(1, "#070808");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const g1 = ctx.createRadialGradient(CARD_W * 0.95, -40, 10, CARD_W * 0.95, -40, 620);
  g1.addColorStop(0, hexA(accent, 0.42)); g1.addColorStop(0.45, hexA(accent, 0.12)); g1.addColorStop(1, hexA(accent, 0));
  ctx.fillStyle = g1; ctx.fillRect(0, 0, CARD_W, CARD_H);
  const g2 = ctx.createRadialGradient(-40, CARD_H + 20, 10, -40, CARD_H + 20, 520);
  g2.addColorStop(0, hexA(accent, 0.2)); g2.addColorStop(1, hexA(accent, 0));
  ctx.fillStyle = g2; ctx.fillRect(0, 0, CARD_W, CARD_H);

  // giant outlined rank numeral behind everything
  ctx.save();
  ctx.font = `800 620px ${sans}`;
  ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
  ctx.lineWidth = 3;
  const stroke = ctx.createLinearGradient(0, 120, 0, 760);
  stroke.addColorStop(0, hexA(accent, 0.55)); stroke.addColorStop(1, hexA(accent, 0.04));
  ctx.strokeStyle = stroke;
  ctx.strokeText(String(index + 1).padStart(2, "0"), CARD_W + 30, 700);
  ctx.restore();

  // top row: dated dot + date, count
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.font = `500 26px ${mono}`;
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(PAD + 7, 110, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(item.date.toUpperCase(), PAD + 28, 111);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText(`${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, CARD_W - PAD, 111);

  // medal, left aligned
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.shadowColor = hexA(accent, 0.45); ctx.shadowBlur = 50; ctx.shadowOffsetY = 12;
  ctx.font = "200px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(item.icon, PAD - 12, 400);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // title: big, tight, white
  ctx.font = `800 128px ${sans}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(item.title, PAD - 4, 700);

  // event in the accent colour
  ctx.font = `600 40px ${sans}`;
  ctx.fillStyle = accent;
  let y = 774;
  for (const l of wrap(ctx, item.event, CARD_W - PAD * 2)) { ctx.fillText(l, PAD, y); y += 54; }

  // description, muted
  y += 14;
  ctx.font = `400 30px ${sans}`;
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  for (const l of wrap(ctx, item.desc, CARD_W - PAD * 2).slice(0, 4)) { ctx.fillText(l, PAD, y); y += 42; }

  // footer: hairline, label, short accent bar
  const fy = CARD_H - 70;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(PAD, fy - 42, CARD_W - PAD * 2, 1.5);
  ctx.font = `500 21px ${mono}`;
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("ACHIEVEMENT", PAD, fy + 8);
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.roundRect(CARD_W - PAD - 64, fy + 5, 64, 5, 3); ctx.fill();

  // edge: a hairline lit from the top-right in the accent colour
  const edge = ctx.createLinearGradient(CARD_W, 0, 0, CARD_H);
  edge.addColorStop(0, hexA(accent, 0.9));
  edge.addColorStop(0.4, "rgba(255,255,255,0.12)");
  edge.addColorStop(1, "rgba(255,255,255,0.04)");
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = edge;
  ctx.beginPath(); ctx.roundRect(1.5, 1.5, CARD_W - 3, CARD_H - 3, R - 1.5); ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}
