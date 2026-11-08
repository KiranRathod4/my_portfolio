"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useEffect, useMemo, useRef } from "react";
import { sfx } from "@/lib/sfx";

const LIME = new THREE.Color("#b4f03c");
const AMBER = new THREE.Color("#ffab2e"); // the enter cube turns amber under the cursor
const BASE = new THREE.Color("#171c17");

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const ROWS = 9;            // odd, so a cube sits exactly in the centre
const LEAVE_BASE = 0.3;    // seconds before the wall starts to fall
const LEAVE_SPREAD = 0.1;  // extra seconds of delay per cell of distance from the centre
const LEAVE_DUR = 1.1;     // how long one cube takes to fall away

type Props = { leaving: boolean; onDone: () => void };

function Cubes({ leaving, onDone }: Props) {
  const { viewport, size } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const st = useRef({ leaveT: -1, done: false, lastHover: -1, lastHoverAt: 0, hc: 0 });
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const vw = viewport.width, vh = viewport.height;
  const cell = vh / (ROWS - 2);   // two rows overflow the screen so edges stay covered at depth
  let cols = Math.ceil(vw / cell) + 3;
  if (cols % 2 === 0) cols += 1;

  // per-cube constants
  const data = useMemo(() => {
    const n = cols * ROWS;
    let seed = 1337;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const cx = (cols - 1) / 2, cy = (ROWS - 1) / 2;
    const items = Array.from({ length: n }, (_, k) => {
      const i = k % cols, j = Math.floor(k / cols);
      const gx = i - cx, gy = j - cy;
      const dist = Math.hypot(gx, gy);
      const ang = Math.atan2(gy, gx);
      const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      return {
        x: gx * cell, y: -gy * cell, dist,
        ph: rnd() * Math.PI * 2, ph2: rnd() * Math.PI * 2, r: rnd(),
        axis, spin: 2 + rnd() * 5,
        dx: Math.cos(ang) + (rnd() - 0.5) * 0.8,
        center: i === (cols - 1) / 2 && j === (ROWS - 1) / 2,
      };
    });
    const maxDist = Math.max(...items.map((c) => c.dist));
    return { items, n, maxDist, count: n };
  }, [cols, cell]);

  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.09), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // pointer (window-level so the full-screen button on top doesn't block it)
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    const s = st.current;
    if (leavingRef.current && s.leaveT < 0) s.leaveT = t;
    const lt = s.leaveT >= 0 ? t - s.leaveT : -1;

    const px = (pointer.current.x * vw) / 2;
    const py = (pointer.current.y * vh) / 2;
    const reach = cell * 0.95;
    // how much the cursor is over the centre cube (eased), drives its colour change
    const over = clamp(1 - Math.hypot(px, py) / (cell * 0.62)) > 0.2 ? 1 : 0;
    s.hc += (over - s.hc) * 0.18;
    let nearest = -1, nearestD = 1e9;

    data.items.forEach((c, k) => {
      // ---- entrance: the wall rises into place from the centre outward ----
      const intro = easeOut(clamp((t - 0.1 - c.dist * 0.04 - c.r * 0.12) / 0.95));

      // ---- idle: slow undulation in depth ----
      const zIdle = cell * 0.34 * (Math.sin(t * 0.65 + c.ph) + 0.6 * Math.sin(t * 0.37 + c.ph2 * 1.7));

      // ---- pointer: cubes near the cursor pop forward and light up ----
      const dx = c.x - px, dy = c.y - py;
      const d2 = dx * dx + dy * dy;
      const infl = Math.exp(-d2 / (2 * reach * reach)) * (lt < 0 ? 1 : 0);
      if (d2 < nearestD) { nearestD = d2; nearest = k; }

      let x = c.x, y = c.y;
      let z = zIdle + infl * cell * 0.9 - (1 - intro) * cell * 8;
      let sc = cell * 0.94 * (0.6 + 0.4 * intro) * (1 + 0.04 * Math.sin(t * 0.5 + c.ph));
      let rx = 0.06 * Math.sin(t * 0.4 + c.ph) + (py - c.y) * 0.03 * infl;
      let ry = 0.06 * Math.cos(t * 0.45 + c.ph2) - (px - c.x) * 0.03 * infl;
      let rz = (c.r - 0.5) * 0.1;

      // the centre cube: lime "enter" button
      if (c.center) {
        z += cell * 0.5;
        sc *= 1.08 + 0.1 * clamp(1 - Math.hypot(px, py) / (cell * 1.2)) + 0.1 * s.hc;
      }

      // ---- leaving: swell the centre cube, then the whole wall tumbles away ----
      if (lt >= 0) {
        // the centre cube swells first, then tumbles away with the rest
        const swell = c.center ? 1 + 0.55 * easeOut(clamp(lt / 0.3)) : 1;
        const delay = c.center ? LEAVE_BASE : LEAVE_BASE + c.dist * LEAVE_SPREAD + c.r * 0.2;
        const tt = clamp((lt - delay) / LEAVE_DUR);
        const e = tt * tt;
        x += c.dx * e * cell * 3;
        y -= e * cell * 9;
        z += easeInOut(tt) * cell * 7;
        const ang = e * c.spin;
        rx += c.axis.x * ang; ry += c.axis.y * ang; rz += c.axis.z * ang;
        sc *= swell * (1 - 0.35 * tt);
      }

      dummy.position.set(x, y, z);
      dummy.rotation.set(rx, ry, rz);
      dummy.scale.setScalar(Math.max(sc, 0.0001));
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);

      // colour: dark by default, lime near the cursor, lime for the centre button
      color.copy(BASE);
      color.offsetHSL(0, 0, (c.r - 0.5) * 0.02 + 0.015 * Math.sin(t * 0.5 + c.ph));
      if (c.center) color.copy(LIME).lerp(AMBER, s.hc);
      else color.lerp(LIME, clamp(infl * 0.7));
      mesh.setColorAt(k, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // lime light that follows the cursor and washes over the nearby cubes
    if (lightRef.current) {
      lightRef.current.position.set(px, py, cell * 2.6);
      lightRef.current.color.set("#d6ff6a").lerp(AMBER, s.hc);
      lightRef.current.intensity = lt < 0 ? cell * cell * 26 : Math.max(0, cell * cell * 26 * (1 - lt / 0.4));
    }

    // soft tick when the pointer moves onto a different cube
    const now = performance.now();
    if (lt < 0 && nearest !== s.lastHover && nearestD < reach * reach && now - s.lastHoverAt > 90) {
      s.lastHover = nearest; s.lastHoverAt = now;
      sfx.hover();
    }

    // finished: tell the parent to remove the gate
    if (lt >= 0 && !s.done && lt > LEAVE_BASE + data.maxDist * LEAVE_SPREAD + 0.2 + LEAVE_DUR + 0.1) {
      s.done = true;
      onDone();
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[-3, 5, 9]} intensity={1.0} color="#e6f4cf" />
      <directionalLight position={[9, -3, 4]} intensity={0.9} color="#b4f03c" />
      <pointLight ref={lightRef} color="#d6ff6a" distance={cell * 5.5} decay={2} />
      <instancedMesh
        ref={meshRef}
        args={[geometry, undefined, data.count]}
        frustumCulled={false}
        key={data.count}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.42} metalness={0.12} />
      </instancedMesh>
    </>
  );
}

export default function CubeGateScene(props: Props) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 16], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Cubes {...props} />
    </Canvas>
  );
}
