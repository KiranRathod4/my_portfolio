"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useEffect, useMemo, useRef } from "react";
import { sfx } from "@/lib/sfx";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const Y_AXIS = AXES[1];
const PITCH = 1.2;       // spacing between blocks
const SIZE = 1.08;       // block size
const TURN_TIME = 0.45;  // seconds per layer turn
const SPIN_TURNS = 1.5;  // full turns of the cube across the scroll range
const N = 27;

/* Two colours only: lime and cream, in a checker pattern. Hidden inner faces are near-black. */
const LIME = new THREE.Color("#b4f03c");
const CREAM = new THREE.Color("#f1f3e6");
const CORE = new THREE.Color("#10150e");

type Props = { sectionRef: React.RefObject<HTMLElement | null> };

/** Per-instance face colours: the pattern travels with each block as layers turn. */
function makeFaceMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.36, metalness: 0.0, vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uA = { value: LIME };
    shader.uniforms.uB = { value: CREAM };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        uniform vec3 uA; uniform vec3 uB;
        attribute vec3 aF0; attribute vec3 aF1; attribute vec3 aF2; attribute vec3 aF3; attribute vec3 aF4; attribute vec3 aF5;
        attribute float aHover;`)
      .replace("#include <color_vertex>", `#include <color_vertex>
        vec3 an = abs(normal);
        vec3 fc = an.x > an.y && an.x > an.z ? (normal.x > 0.0 ? aF0 : aF1) : (an.y > an.z ? (normal.y > 0.0 ? aF2 : aF3) : (normal.z > 0.0 ? aF4 : aF5));
        // a hovered block flips its two colours (lime <-> cream); the dark core stays dark
        float da = distance(fc, uA); float db = distance(fc, uB);
        vec3 sw = (min(da, db) > 0.25) ? fc : (da < db ? uB : uA);
        vColor.rgb = mix(fc, sw, aHover);`);
  };
  return mat;
}

/** Thin dark outline: the same mesh pushed out along its normals and drawn back-face only. */
function makeOutlineMaterial() {
  const mat = new THREE.MeshBasicMaterial({ color: "#0a0f08", side: THREE.BackSide });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += normalize(normal) * 0.06;");
  };
  return mat;
}

function Cubes({ sectionRef }: Props) {
  const { viewport, pointer, gl, scene } = useThree();
  const shadowRef = useRef<THREE.Mesh>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const outlineRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef(0);

  const D = useMemo(() => {
    let seed = 99;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    void rnd;
    const grid = Array.from({ length: N }, (_, k) => new THREE.Vector3((k % 3) - 1, (Math.floor(k / 3) % 3) - 1, Math.floor(k / 9) - 1));

    // faces (+x, -x, +y, -y, +z, -z): outer faces get a checker of lime/cream, inner faces are dark
    const faces = new Float32Array(N * 6 * 3);
    const c = new THREE.Color();
    for (let k = 0; k < N; k++) {
      const g = grid[k];
      for (let f = 0; f < 6; f++) {
        const axis = f >> 1, positive = f % 2 === 0;
        const outer = Math.round(g.getComponent(axis)) === (positive ? 1 : -1);
        if (!outer) c.copy(CORE);
        else {
          const others = [0, 1, 2].filter((a) => a !== axis).map((a) => Math.abs(Math.round(g.getComponent(a))));
          c.copy((others[0] + others[1]) % 2 === 0 ? LIME : CREAM);
        }
        faces.set([c.r, c.g, c.b], (k * 6 + f) * 3);
      }
    }
    return {
      grid, faces,
      qd: Array.from({ length: N }, () => new THREE.Quaternion()),
      hv: new Array<number>(N).fill(0),
      anim: { active: false, axis: 0, layer: 0, dir: 1, t: 0, cooldown: 0 },
      hover: -1, hoverAt: 0, idleAt: 2,
    };
  }, []);

  // shared rounded-cube geometry with per-instance face colours + hover amount
  const geometry = useMemo(() => {
    const g = new RoundedBoxGeometry(1, 1, 1, 4, 0.12);
    const verts = g.getAttribute("position").count;
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(verts * 3).fill(1), 3));
    for (let f = 0; f < 6; f++) {
      const arr = new Float32Array(N * 3);
      for (let k = 0; k < N; k++) arr.set(D.faces.subarray((k * 6 + f) * 3, (k * 6 + f) * 3 + 3), k * 3);
      g.setAttribute(`aF${f}`, new THREE.InstancedBufferAttribute(arr, 3));
    }
    g.setAttribute("aHover", new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
    return g;
  }, [D]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // soft studio reflections so the blocks read as glossy plastic
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.5;
    return () => { scene.environment = null; env.dispose(); pm.dispose(); };
  }, [gl, scene]);

  // contact shadow under the cube (a squashed radial gradient facing the camera)
  const shadowTex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(128, 32, 0, 128, 32, 128);
    g.addColorStop(0, "rgba(0,0,0,0.85)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.setTransform(1, 0, 0, 0.5, 0, 16); x.fillStyle = g; x.fillRect(0, -32, 256, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  useEffect(() => () => shadowTex.dispose(), [shadowTex]);

  const faceMat = useMemo(makeFaceMaterial, []);
  const outlineMat = useMemo(makeOutlineMaterial, []);
  useEffect(() => () => { faceMat.dispose(); outlineMat.dispose(); }, [faceMat, outlineMat]);

  // hit-testing uses the bounding sphere; keep it generous because the cube spins
  useEffect(() => {
    if (meshRef.current) meshRef.current.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);
  }, []);

  const tmp = useMemo(() => ({
    obj: new THREE.Object3D(), p1: new THREE.Vector3(),
    q1: new THREE.Quaternion(), qa: new THREE.Quaternion(), qv: new THREE.Quaternion(), qs: new THREE.Quaternion(),
    euler: new THREE.Euler(),
  }), []);

  useFrame((state, dtRaw) => {
    const mesh = meshRef.current;
    const outline = outlineRef.current;
    if (!mesh || !outline) return;
    const dt = Math.min(dtRaw, 0.05);
    const t = state.clock.elapsedTime;
    const { obj, p1, q1, qa, qv, qs } = tmp;

    // ---- scroll progress through the hero ----
    let p = 0;
    const el = sectionRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      p = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
    }
    // the cube spins as you scroll (eased, so it keeps a little momentum), plus a slow idle drift
    spinRef.current += (p * SPIN_TURNS * Math.PI * 2 - spinRef.current) * (1 - Math.exp(-dt * 4.5));
    qs.setFromAxisAngle(Y_AXIS, spinRef.current + t * 0.12);

    // ---- responsive layout: a smaller cube, over on the right ----
    const wide = viewport.width > 8;
    const fit = clamp(viewport.width / 14, 0.5, 1);
    if (groupRef.current) groupRef.current.scale.setScalar(fit);
    const ox = wide ? viewport.width * 0.245 : 0;
    const oy = wide ? 0 : -viewport.height * 0.38;   // phones: text on top, cube underneath

    // tilt so its depth reads, leaning a little toward the pointer
    qv.setFromEuler(tmp.euler.set(0.5 - pointer.y * 0.16, -0.5 + pointer.x * 0.2, 0.04));

    // ---- puzzle layer turns ----
    const an = D.anim;
    an.cooldown = Math.max(0, an.cooldown - dt);
    // a turn needs the pointer to be actively moving over a block; stale hover state never triggers one
    const now = performance.now();
    const fresh = now - D.hoverAt < 140;
    const hv = fresh ? D.hover : -1;
    if (hv >= 0 && hv < N) D.hv[hv] = 1;
    let trigger = -1, silent = false;
    if (!an.active && an.cooldown <= 0) {
      if (hv >= 0 && hv < N) trigger = hv;
      else if (t > D.idleAt && now - D.hoverAt > 2500) {   // idle: the cube quietly shuffles itself
        trigger = Math.floor(Math.random() * N); silent = true; D.idleAt = t + 3.2 + Math.random() * 1.6;
      }
    }
    if (trigger >= 0) {
      an.axis = Math.floor(Math.random() * 3);
      an.layer = Math.round(D.grid[trigger].getComponent(an.axis));
      an.dir = Math.random() < 0.5 ? 1 : -1;
      an.t = 0; an.active = true; an.cooldown = TURN_TIME + 0.12;
      D.hover = -1;                 // consume the hover so it can't fire again until the pointer moves
      if (!silent) sfx.clack();
    }
    let turning = false;
    if (an.active) {
      an.t = Math.min(1, an.t + dt / TURN_TIME);
      qa.setFromAxisAngle(AXES[an.axis], an.dir * (Math.PI / 2) * easeInOut(an.t));
      turning = true;
      if (an.t >= 1) {
        for (let k = 0; k < N; k++) {
          if (Math.round(D.grid[k].getComponent(an.axis)) === an.layer) {
            D.grid[k].applyQuaternion(qa);
            D.grid[k].set(Math.round(D.grid[k].x), Math.round(D.grid[k].y), Math.round(D.grid[k].z));
            D.qd[k].premultiply(qa);
          }
        }
        an.active = false; turning = false;
      }
    }

    const hoverAttr = geometry.getAttribute("aHover") as THREE.InstancedBufferAttribute;

    for (let k = 0; k < N; k++) {
      p1.copy(D.grid[k]); q1.copy(D.qd[k]);
      if (turning && Math.round(D.grid[k].getComponent(an.axis)) === an.layer) {
        p1.applyQuaternion(qa); q1.premultiply(qa);
      }
      p1.applyQuaternion(qs); q1.premultiply(qs);   // spin about the cube's own vertical axis
      p1.applyQuaternion(qv); q1.premultiply(qv);   // then tilt the whole thing toward the camera
      p1.multiplyScalar(PITCH); p1.x += ox; p1.y += oy + Math.sin(t * 0.8) * 0.12;

      D.hv[k] *= Math.exp(-dt * 3.2);
      p1.z += D.hv[k] * 0.4;

      obj.position.copy(p1); obj.quaternion.copy(q1); obj.scale.setScalar(SIZE);
      obj.updateMatrix();
      mesh.setMatrixAt(k, obj.matrix);
      outline.setMatrixAt(k, obj.matrix);
      hoverAttr.setX(k, clamp(D.hv[k]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    outline.instanceMatrix.needsUpdate = true;
    hoverAttr.needsUpdate = true;

    if (shadowRef.current) shadowRef.current.position.set(ox, -3.35 + oy, -1.5);
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (e.instanceId !== undefined) { D.hover = e.instanceId; D.hoverAt = performance.now(); } };
  const onOut = () => { D.hover = -1; };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[-4, 6, 9]} intensity={1.25} color="#ffffff" />
      <directionalLight position={[8, -3, 5]} intensity={0.55} color="#eaf6d0" />
      <group ref={groupRef}>
        <mesh ref={shadowRef} renderOrder={-1} raycast={() => null}>
          <planeGeometry args={[5.2, 1.3]} />
          <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.6} />
        </mesh>
        <instancedMesh ref={meshRef} args={[geometry, faceMat, N]} frustumCulled={false} onPointerMove={onMove} onPointerOut={onOut} />
        <instancedMesh ref={outlineRef} args={[geometry, outlineMat, N]} frustumCulled={false} raycast={() => null} />
      </group>
    </>
  );
}

export default function CubeScrollScene({ sectionRef, active }: Props & { active: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 16], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={active ? "always" : "never"}
      style={{ position: "absolute", inset: 0 }}
      onCreated={() => {
        // two frames later the first cube frame is on screen: let the intro curtain know
        requestAnimationFrame(() => requestAnimationFrame(() => {
          (window as unknown as { __heroReady?: boolean }).__heroReady = true;
          window.dispatchEvent(new Event("hero:ready"));
        }));
      }}
    >
      <Cubes sectionRef={sectionRef} />
    </Canvas>
  );
}
