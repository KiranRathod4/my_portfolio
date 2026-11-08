"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Achievement } from "@/lib/achievements";
import { drawCardTexture } from "@/lib/cardTexture";

export type Mode = "stretch" | "bulge" | "drum" | "shatter" | "dust";
export const MODES: Mode[] = ["stretch", "bulge", "drum", "shatter", "dust"];

/* world units */
const CW = 2.3;   // card width
const CH = 2.98;  // card height (keeps the 0.77 aspect of the texture)
const SP = 3.0;   // spacing between card centres

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */
const FRAG_END = /* glsl */ `
  #include <colorspace_fragment>
`;

/* Stretch (0), Bulge (1), Drum (2) share one material */
const WARP_V = /* glsl */ `
  uniform float uCx, uD, uVel, uSpd, uTime, uHover;
  uniform int uMode;
  varying vec2 vUv;
  varying float vOuter, vAmt, vSd, vShade;
  const float W = ${CW.toFixed(2)};
  const float H = ${CH.toFixed(2)};
  const float R = 5.2;
  vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c*v.x + s*v.z, v.y, -s*v.x + c*v.z); }
  void main() {
    vUv = uv;
    float a = abs(uD);
    float sd = uD < 0.0 ? -1.0 : 1.0;
    vSd = sd;
    vec3 p = position;
    p.xy *= 1.0 + 0.04 * uHover;        // hovered card swells slightly
    float nx = p.x / (W * 0.5);
    float ny = p.y / (H * 0.5);
    vec3 w;
    vOuter = 0.0; vAmt = 0.0; vShade = 1.0;

    if (uMode == 0) {                       // STRETCH: neighbours smear outward and flare
      float s = smoothstep(0.3, 1.5, a);
      vec3 q = rotY(p, clamp(uVel * 0.07, -0.6, 0.6) - uD * 0.05);
      float outer = clamp(nx * sd * 0.5 + 0.5, 0.0, 1.0);
      float o2 = outer * outer;
      q.x += sd * s * o2 * (1.3 + 1.2 * s);
      q.y *= 1.0 + s * o2 * 0.55;
      w = q + vec3(uCx, 0.0, -s * 0.5);
      vOuter = outer; vAmt = s;
      vShade = 1.0 - 0.15 * smoothstep(0.0, 1.5, a);
    } else if (uMode == 1) {                // BULGE: lens-like barrel, centre card pushed forward
      float c = 1.0 - smoothstep(0.0, 1.3, a);
      float sc = mix(0.86, 1.06, c);
      vec3 q = rotY(p, clamp(-uD * 0.45, -0.85, 0.85) + clamp(uVel * 0.03, -0.3, 0.3));
      float k = 0.07 + clamp(uSpd * 0.05, 0.0, 0.12);
      q.x *= 1.0 + k * (1.0 - ny * ny);
      q.y *= 1.0 + k * (1.0 - nx * nx);
      q.z += 0.5 * (1.0 - nx * nx) * (1.0 - ny * ny) * (0.4 + 0.6 * c);
      q.xy *= sc;
      w = q + vec3(uCx * 1.04, 0.0, -a * 0.45);
      vShade = 1.0 - 0.38 * smoothstep(0.0, 1.6, a);
    } else {                                // DRUM: cards wrapped around a cylinder
      float th = (p.x + uCx) / R;
      w = vec3(R * sin(th), p.y * (1.0 - 0.05 * a), R * (cos(th) - 1.0));
      vShade = 1.0 - 0.4 * smoothstep(0.0, 1.8, a);
    }
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
  }
`;

const WARP_F = /* glsl */ `
  uniform sampler2D uMap;
  uniform int uMode;
  uniform float uSpd, uTime, uAlpha, uHover;
  varying vec2 vUv;
  varying float vOuter, vAmt, vSd, vShade;
  void main() {
    vec2 uv = vUv;
    vec4 c;
    if (uMode == 2) {                       // horizontal motion blur while moving
      float bl = clamp(uSpd * 0.011, 0.0, 0.06);
      c = vec4(0.0);
      for (int i = -4; i <= 4; i++) c += texture2D(uMap, vec2(clamp(uv.x + float(i) * bl * 0.25, 0.0, 1.0), uv.y));
      c /= 9.0;
    } else if (uMode == 0) {                // smear the outer pixels toward the edge
      float edge = vSd > 0.0 ? 1.0 : 0.0;
      float u = mix(uv.x, edge, vAmt * pow(vOuter, 1.4) * 0.93);
      c = texture2D(uMap, vec2(u, uv.y));
      c.a *= 1.0 - vAmt * pow(vOuter, 3.0) * 0.5;
    } else {
      c = texture2D(uMap, uv);
    }
    gl_FragColor = vec4(c.rgb * vShade * (1.0 + 0.12 * uHover), c.a * uAlpha);
    ${FRAG_END}
  }
`;

/* Shatter: every triangle is flung out and tumbles */
const SHARD_V = /* glsl */ `
  attribute vec2 aCenter;
  attribute vec3 aRand;
  attribute vec3 aBary;
  uniform float uCx, uD, uSpd;
  varying vec2 vUv;
  varying vec3 vBary;
  varying float vP, vShade, vR;
  void main() {
    vUv = uv; vBary = aBary; vR = aRand.x;
    float a = abs(uD);
    float sd = uD < 0.0 ? -1.0 : 1.0;
    float p = clamp(smoothstep(0.4, 2.2, a) * 0.7 + clamp(uSpd * 0.1, 0.0, 0.3), 0.0, 1.4);
    vP = p;
    vec3 c = vec3(aCenter, 0.0);
    vec3 q = position - c;
    float ang = (aRand.x - 0.5) * 3.2 * p;
    q.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q.xy;
    float ang2 = (aRand.y - 0.5) * 2.4 * p;
    q.yz = mat2(cos(ang2), -sin(ang2), sin(ang2), cos(ang2)) * q.yz;
    vec3 dir = normalize(vec3(aCenter * vec2(0.8, 0.5) + (aRand.xy - 0.5) * 1.4, (aRand.z - 0.2) * 1.2));
    vec3 off = dir * p * (0.3 + aRand.z * 0.9);
    off.x += sd * p * (0.25 + aRand.y * 0.8);
    off.y -= p * p * aRand.z * 0.6;
    vec3 w = c + q + off + vec3(uCx, 0.0, 0.0);
    vShade = 1.0 - 0.25 * smoothstep(0.0, 1.5, a);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
  }
`;

const SHARD_F = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uAlpha;
  varying vec2 vUv;
  varying vec3 vBary;
  varying float vP, vShade, vR;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    float e = min(min(vBary.x, vBary.y), vBary.z);
    float cs = smoothstep(0.02, 0.3, vP);
    float line = 1.0 - smoothstep(0.0, 0.045 + 0.02 * vP, e);
    c.rgb = mix(c.rgb, vec3(0.9, 1.0, 0.8), line * cs * 0.3);
    c.rgb *= 0.85 + 0.3 * fract(vR * 7.0) * cs;
    float fade = 1.0 - smoothstep(1.2, 1.6, vP);
    gl_FragColor = vec4(c.rgb * vShade, c.a * fade * uAlpha);
    ${FRAG_END}
  }
`;

/* Dust: the outer part of a card dissolves into drifting particles */
const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) { return 0.55 * noise(p) + 0.3 * noise(p * 2.1 + 3.0) + 0.15 * noise(p * 4.3 + 7.0); }
  float keyAt(vec2 uv, float sd) {
    float outer = sd > 0.0 ? uv.x : 1.0 - uv.x;
    return outer * 0.68 + fbm(uv * vec2(7.0, 9.0)) * 0.32;
  }
  float thr(float a) { return 1.0 - smoothstep(0.4, 2.0, a) * 1.3; }
`;

const DUSTPLANE_V = /* glsl */ `
  uniform float uCx, uD;
  varying vec2 vUv;
  varying float vSd;
  void main() {
    vUv = uv;
    vSd = uD < 0.0 ? -1.0 : 1.0;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position + vec3(uCx, 0.0, 0.0), 1.0);
  }
`;

const DUSTPLANE_F = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uD, uAlpha;
  varying vec2 vUv;
  varying float vSd;
  ${NOISE}
  void main() {
    float k = keyAt(vUv, vSd);
    float th = thr(abs(uD));
    if (k > th) discard;
    vec4 c = texture2D(uMap, vUv);
    float rim = smoothstep(th - 0.035, th, k);
    c.rgb += vec3(0.7, 0.95, 0.3) * rim * 0.1;
    gl_FragColor = vec4(c.rgb, c.a * uAlpha);
    ${FRAG_END}
  }
`;

const DUST_V = /* glsl */ `
  attribute vec3 aRand;
  uniform sampler2D uMap;
  uniform float uCx, uD, uTime, uSize, uAlpha;
  varying vec4 vCol;
  varying float vA;
  ${NOISE}
  void main() {
    float a = abs(uD);
    float sd = uD < 0.0 ? -1.0 : 1.0;
    float k = keyAt(uv, sd);
    float th = thr(a);
    float q = clamp((k - th) / 0.5, 0.0, 1.0);
    if (q <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; vCol = vec4(0.0); return; }
    vec4 tc = texture2D(uMap, uv);
    vCol = tc;
    vec3 p = position + vec3(uCx, 0.0, 0.0);
    float e = q * q;
    vec2 dir = vec2(sd * (0.5 + aRand.x * 2.4), (aRand.y - 0.5) * 1.3);
    p.xy += dir * e * 2.6;
    p.xy += vec2(sin(uTime * 2.0 + aRand.z * 40.0), cos(uTime * 2.3 + aRand.x * 40.0)) * 0.05 * q;
    p.z += (aRand.z - 0.5) * q * 1.4;
    vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.5 + aRand.x * 0.9) * (1.0 - 0.45 * q) / (-mv.z);
    vA = (1.0 - q * q) * tc.a * uAlpha;
  }
`;

const DUST_F = /* glsl */ `
  varying vec4 vCol;
  varying float vA;
  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    gl_FragColor = vec4(vCol.rgb, vA);
    ${FRAG_END}
  }
`;

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */
function makeShardGeo() {
  const cols = 8, rows = 10;
  const rnd = mulberry32(7);
  const pts: [number, number][] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      let x = i / cols, y = j / rows;
      if (i > 0 && i < cols && j > 0 && j < rows) { x += ((rnd() - 0.5) * 0.7) / cols; y += ((rnd() - 0.5) * 0.7) / rows; }
      pts.push([x, y]);
    }
  }
  const pos: number[] = [], uvs: number[] = [], cen: number[] = [], rn: number[] = [], bary: number[] = [];
  const B = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const tri = (a: number, b: number, c: number) => {
    const P = [pts[a], pts[b], pts[c]];
    const cx = (P[0][0] + P[1][0] + P[2][0]) / 3, cy = (P[0][1] + P[1][1] + P[2][1]) / 3;
    const r = [rnd(), rnd(), rnd()];
    P.forEach((q, k) => {
      pos.push((q[0] - 0.5) * CW, (q[1] - 0.5) * CH, 0);
      uvs.push(q[0], q[1]);
      cen.push((cx - 0.5) * CW, (cy - 0.5) * CH);
      rn.push(r[0], r[1], r[2]);
      bary.push(B[k][0], B[k][1], B[k][2]);
    });
  };
  const idx = (i: number, j: number) => j * (cols + 1) + i;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
      if ((i + j) % 2) { tri(a, b, d); tri(a, d, c); } else { tri(a, b, c); tri(b, d, c); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("aCenter", new THREE.Float32BufferAttribute(cen, 2));
  g.setAttribute("aRand", new THREE.Float32BufferAttribute(rn, 3));
  g.setAttribute("aBary", new THREE.Float32BufferAttribute(bary, 3));
  return g;
}

function makeDustGeo() {
  const nx = 96, ny = 124;
  const rnd = mulberry32(21);
  const pos: number[] = [], uvs: number[] = [], rn: number[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const u = (i + rnd()) / nx, v = (j + rnd()) / ny;
      pos.push((u - 0.5) * CW, (v - 0.5) * CH, 0);
      uvs.push(u, v);
      rn.push(rnd(), rnd(), rnd());
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("aRand", new THREE.Float32BufferAttribute(rn, 3));
  return g;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */
type Card = {
  warp: THREE.Mesh; shard: THREE.Mesh; dustPlane: THREE.Mesh; dustPoints: THREE.Points;
  mats: THREE.ShaderMaterial[];
};

function build(items: Achievement[], dpr: number) {
  const root = new THREE.Group();
  const planeGeo = new THREE.PlaneGeometry(CW, CH, 48, 64);
  const shardGeo = makeShardGeo();
  const dustGeo = makeDustGeo();
  const textures: THREE.Texture[] = [];

  const cards: Card[] = items.map((it, i) => {
    const tex = drawCardTexture(it, i, items.length);
    textures.push(tex);
    const base = () => ({
      uMap: { value: tex }, uCx: { value: 0 }, uD: { value: 0 }, uVel: { value: 0 },
      uSpd: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 0 }, uHover: { value: 0 },
    });
    const make = (vs: string, fs: string, extra: Record<string, THREE.IUniform> = {}) =>
      new THREE.ShaderMaterial({
        uniforms: { ...base(), ...extra }, vertexShader: vs, fragmentShader: fs,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });

    const warpM = make(WARP_V, WARP_F, { uMode: { value: 0 } });
    const shardM = make(SHARD_V, SHARD_F);
    const dpM = make(DUSTPLANE_V, DUSTPLANE_F);
    const dustM = make(DUST_V, DUST_F, { uSize: { value: 34 * dpr } });

    const warp = new THREE.Mesh(planeGeo, warpM);
    const shard = new THREE.Mesh(shardGeo, shardM);
    const dustPlane = new THREE.Mesh(planeGeo, dpM);
    const dustPoints = new THREE.Points(dustGeo, dustM);
    [warp, shard, dustPlane, dustPoints].forEach((o) => { o.frustumCulled = false; root.add(o); });
    return { warp, shard, dustPlane, dustPoints, mats: [warpM, shardM, dpM, dustM] };
  });

  const dispose = () => {
    planeGeo.dispose(); shardGeo.dispose(); dustGeo.dispose();
    textures.forEach((t) => t.dispose());
    cards.forEach((c) => c.mats.forEach((m) => m.dispose()));
  };
  return { root, cards, dispose };
}

type SceneProps = {
  items: Achievement[];
  mode: Mode;
  sectionRef: React.RefObject<HTMLElement | null>;
  onMotion: (pos: number, vel: number) => void;
  /** extra forward spin (in cards) added on top of the scroll position, used by auto-play */
  extraRef: React.MutableRefObject<number>;
  /** set to n to subtract one full lap from the position without any visible jump */
  shiftRef: React.MutableRefObject<number>;
};

function Cards({ items, mode, sectionRef, onMotion, extraRef, shiftRef }: SceneProps) {
  const { scene, size, gl, pointer, viewport } = useThree();
  const n = items.length;
  const built = useMemo(() => build(items, Math.min(gl.getPixelRatio(), 2)), [items, gl]);
  const st = useRef({ pos: 0, prev: 0, vel: 0, time: 0, intro: 0, rx: 0, ry: 0, hover: [] as number[] });
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    scene.add(built.root);
    return () => { scene.remove(built.root); built.dispose(); };
  }, [built, scene]);

  useFrame((_, dtRaw) => {
    const s = st.current;
    const dt = Math.min(dtRaw, 0.05);
    s.time += dt;

    // seamless wrap: remove one lap from both the position and the target together
    if (shiftRef.current) { s.pos -= shiftRef.current; s.prev -= shiftRef.current; shiftRef.current = 0; }

    // scroll position of the pinned section -> carousel position
    let target = s.pos;
    const el = sectionRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      target = clamp(-r.top / total, 0, 1) * (n - 1) + extraRef.current;
    }
    s.pos += (target - s.pos) * (1 - Math.exp(-dt * 6.5));
    const raw = (s.pos - s.prev) / Math.max(dt, 1e-3);
    s.prev = s.pos;
    s.vel += (raw - s.vel) * (1 - Math.exp(-dt * 10));
    s.intro = Math.min(1, s.intro + dt * 0.9);
    onMotion(s.pos, s.vel);

    // layout + gentle pointer parallax
    const aspect = size.width / size.height;
    const sc = clamp(Math.min(aspect / 1.55, 1.15), 0.5, 1.15) * 0.8;
    const root = built.root;
    root.scale.setScalar(sc);
    root.position.y = -0.12 + (1 - ease(s.intro)) * -1.3;
    s.ry += (pointer.x * 0.1 - s.ry) * 0.06;
    s.rx += (-pointer.y * 0.05 - s.rx) * 0.06;
    root.rotation.set(s.rx, s.ry, 0);

    const m = modeRef.current;
    const mi = MODES.indexOf(m);
    const alpha = ease(s.intro);
    const wx = (pointer.x * viewport.width) / 2;
    const wy = (pointer.y * viewport.height) / 2;
    built.cards.forEach((c, i) => {
      let d = i - s.pos;
      d -= n * Math.round(d / n);                 // wrap so neighbours loop around
      const a = Math.abs(d);
      // is the pointer over this card? (smoothly eased 0..1)
      const over = a < 0.6 && Math.abs(wx - d * SP * sc) < CW * 0.5 * sc && Math.abs(wy - root.position.y) < CH * 0.5 * sc ? 1 : 0;
      s.hover[i] = (s.hover[i] ?? 0) + (over - (s.hover[i] ?? 0)) * (1 - Math.exp(-dt * 9));
      const show = a < 2.9;
      c.warp.visible = show && mi <= 2;
      c.shard.visible = show && mi === 3;
      c.dustPlane.visible = show && mi === 4;
      c.dustPoints.visible = show && mi === 4;
      const order = 20 - Math.round(a * 4);
      [c.warp, c.shard, c.dustPlane, c.dustPoints].forEach((o) => { o.renderOrder = order; });
      c.mats.forEach((mat) => {
        const u = mat.uniforms;
        u.uCx.value = d * SP;
        u.uD.value = d;
        u.uVel.value = s.vel;
        u.uSpd.value = Math.abs(s.vel);
        u.uTime.value = s.time;
        u.uAlpha.value = alpha;
        u.uHover.value = s.hover[i];
        if (u.uMode) u.uMode.value = Math.min(mi, 2);
      });
    });
  });

  return null;
}

export default function ShowcaseScene(props: SceneProps & { active: boolean }) {
  const { active, ...rest } = props;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 10], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={active ? "always" : "never"}
      style={{ position: "absolute", inset: 0 }}
    >
      <Cards {...rest} />
    </Canvas>
  );
}
