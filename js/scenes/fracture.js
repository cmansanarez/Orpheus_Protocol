/**
 * fracture.js — PAGE 2A: The Fracture  (glitch_tunnel.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual: ImprovedNoise-deformed wormhole tunnel
 *
 *   • 22 rings × 72 points = 1584-point BufferGeometry. Each ring is a circle
 *     of points whose XY positions are displaced with ImprovedNoise each frame.
 *     As rings recycle (far → near → behind camera → back to far), the noise
 *     Z-parameter advances continuously → the tube writhes and breathes.
 *
 *   • Depth-color gradient: electric blue (far) → signal cyan (mid) →
 *     fragment magenta (near). Semantically: deep Archive signal transforms
 *     to Eurydice's corrupted frequency as it approaches the camera.
 *
 *   • 6 thin wireframe accent rings (THREE.Line) at 2× segment spacing give
 *     structural contrast against the soft point cloud.
 *
 *   • Post-processing: UnrealBloomPass (aggressive, electric) +
 *     custom chromatic aberration ShaderPass.
 *     Chroma base offset = 0.003; spikes to ~0.018 during glitch events.
 *
 *   • Glitch system: cooldown timer fires every 2–7s. On trigger, glitchIntensity
 *     jumps to 1.0 and decays in ~0.14s. Controls chroma offset + bloom spike.
 *
 *   • Scroll drives a decaying velocity impulse layered on top of BASE_SPEED.
 *     The tunnel always moves forward; scrolling accelerates it.
 *
 * Spec reference: Bobby Roe — wormhole-effect + flythru-wireframe-wormhole
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { ImprovedNoise }   from 'three/addons/math/ImprovedNoise.js';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';

import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';

// ── Geometry constants ────────────────────────────────────────────────────────
const SEGMENT_COUNT   = 22;   // rings of points
const RING_POINTS     = 72;   // points per ring
const TUNNEL_RADIUS   = 4.5;  // base tube radius (world units)
const SEGMENT_SPACING = 14;   // Z-distance between rings
const TOTAL_LEN       = SEGMENT_COUNT * SEGMENT_SPACING;  // 308
const TOTAL_POINTS    = SEGMENT_COUNT * RING_POINTS;      // 1584

const RING_COUNT      = 6;    // wireframe accent rings
const RING_SPACING    = SEGMENT_SPACING * 2;  // 28 — sparser than point rings
const TOTAL_RING_LEN  = RING_COUNT * RING_SPACING;  // 168

const RECYCLE_Z       = 4;    // Z threshold — rings recycled when they pass this

// ── Speed ─────────────────────────────────────────────────────────────────────
const BASE_SPEED        = 0.14;   // units/frame baseline — tunnel never stops
const SCROLL_MULTIPLIER = 2.2;    // scrollVelocity scale factor

// ── Scene ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, scene, camera, clock } = createThreeScene(canvas, {
  fov:        82,
  far:        350,
  background: new THREE.Color(0x000000),
});

// ── Post-processing ───────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom: more aggressive than Awakening. The Fracture should feel electric.
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,   // strength  — electric
  0.50,  // radius
  0.05   // threshold — very low; nearly everything glows
);
composer.addPass(bloomPass);

// Chromatic aberration — RGB channels split horizontally.
// Base offset 0.003 is always present (machine wound aesthetic).
// Glitch events push offsetX up to ~0.018 for a sharp burst.
const ChromaShader = {
  uniforms: {
    tDiffuse: { value: null },
    offsetX:  { value: 0.003 },
    offsetY:  { value: 0.000 },
  },
  vertexShader:   /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float offsetX;
    uniform float offsetY;
    varying vec2 vUv;
    void main() {
      float r = texture2D(tDiffuse, vUv + vec2( offsetX,  offsetY)).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + vec2(-offsetX, -offsetY)).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};
const chromaPass = new ShaderPass(ChromaShader);
composer.addPass(chromaPass);

window.addEventListener('resize', () => composer.setSize(window.innerWidth, window.innerHeight));

// ── Noise ─────────────────────────────────────────────────────────────────────
const noise = new ImprovedNoise();

// ── Tunnel BufferGeometry ──────────────────────────────────────────────────────
// Single geometry updated every frame. Positions and colors are CPU-computed;
// GPU sees the updated buffer each frame via needsUpdate.
const positions = new Float32Array(TOTAL_POINTS * 3);
const colors    = new Float32Array(TOTAL_POINTS * 3);

const tunnelGeo = new THREE.BufferGeometry();
tunnelGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
tunnelGeo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

const tunnelMat = new THREE.PointsMaterial({
  size:            1.5,
  vertexColors:    true,
  blending:        THREE.AdditiveBlending,
  depthWrite:      false,
  sizeAttenuation: true,
  transparent:     true,
  opacity:         0.88,
});
scene.add(new THREE.Points(tunnelGeo, tunnelMat));

// Per-segment Z positions (negative = ahead of camera)
const segZ = Array.from({ length: SEGMENT_COUNT }, (_, i) => -i * SEGMENT_SPACING);

// ── Wireframe accent rings ────────────────────────────────────────────────────
// Thin Line rings at twice the point-ring spacing. Provide structure contrast.
// Positioned at Z=0 in local space; world Z set via ring.position.z each frame.
const accentZ    = Array.from({ length: RING_COUNT }, (_, i) => -i * RING_SPACING);
const accentRings = [];

{
  const pts = [];
  for (let i = 0; i <= RING_POINTS; i++) {
    const a = (i / RING_POINTS) * Math.PI * 2;
    pts.push(new THREE.Vector3(
      Math.cos(a) * TUNNEL_RADIUS * 1.10,
      Math.sin(a) * TUNNEL_RADIUS * 1.10,
      0
    ));
  }
  const accentGeo = new THREE.BufferGeometry().setFromPoints(pts);

  for (let i = 0; i < RING_COUNT; i++) {
    const mat  = new THREE.LineBasicMaterial({
      color:       0x3d00ff,
      transparent: true,
      opacity:     0.35,
    });
    const line = new THREE.Line(accentGeo, mat);  // shared geo, own material
    line.position.z = accentZ[i];
    accentRings.push(line);
    scene.add(line);
  }
}

// ── Glitch system ─────────────────────────────────────────────────────────────
let glitchIntensity = 0;            // 0–1, decays after trigger
let glitchCooldown  = 3.0 + Math.random() * 3.0;  // seconds until first glitch

function updateGlitch(delta) {
  glitchCooldown -= delta;
  if (glitchCooldown <= 0) {
    glitchIntensity = 1.0;
    glitchCooldown  = 2.5 + Math.random() * 4.5;  // 2.5 – 7 s between glitches
  }
  if (glitchIntensity > 0) {
    glitchIntensity = Math.max(0, glitchIntensity - delta * 7.0); // ~0.14s decay
  }

  chromaPass.uniforms.offsetX.value = 0.003 + glitchIntensity * 0.018;
  chromaPass.uniforms.offsetY.value = glitchIntensity * 0.005;
  bloomPass.strength = 1.5 + glitchIntensity * 1.1;
}

// ── Depth-color palette ───────────────────────────────────────────────────────
// Far (blue) → mid (cyan) → near (magenta).
// Semantically: deep = clean system signal; near = Eurydice frequency bleeding in.
const COL_FAR  = new THREE.Color(0x3d00ff); // electric blue
const COL_MID  = new THREE.Color(0x00ffe1); // signal cyan
const COL_NEAR = new THREE.Color(0xff00c8); // fragment magenta
const _col     = new THREE.Color();

function depthColor(t) {  // t 0→1 (far→near)
  if (t < 0.5) return _col.copy(COL_FAR).lerp(COL_MID,  t * 2);
  return             _col.copy(COL_MID).lerp(COL_NEAR, (t - 0.5) * 2);
}

// ── Scroll state ──────────────────────────────────────────────────────────────
let scrollVelocity = 0;
let lastProgress   = 0;

const scroll = new ScrollNarrative({
  sensitivity: 0.00030,
  smoothing:   0.08,
  onProgress: (p) => {
    // Additive impulse: faster scrolling = bigger velocity burst
    const raw = (p - lastProgress) * 80;
    scrollVelocity = Math.min(scrollVelocity + raw * 0.45, 0.20);
    lastProgress   = p;
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = (p * 100) + '%';
    if (p > 0.02) document.getElementById('scroll-hint')?.classList.add('hidden');
  },
});
scroll.loadBeatsFromDOM().start();

// ── Geometry update ───────────────────────────────────────────────────────────
const NOISE_FREQ = 0.22;   // spatial frequency of tube deformation
const NOISE_AMP  = 1.15;   // amplitude of XY displacement
let   noiseT     = 0;      // noise time — advances with tunnel speed

function updateTunnel() {
  const speed = BASE_SPEED + scrollVelocity * SCROLL_MULTIPLIER;

  // ── Advance + recycle point-ring segments ──────────────────────────────────
  for (let s = 0; s < SEGMENT_COUNT; s++) {
    segZ[s] += speed;
    if (segZ[s] > RECYCLE_Z) segZ[s] -= TOTAL_LEN;
  }

  // ── Advance + recycle wireframe accent rings ───────────────────────────────
  for (let r = 0; r < RING_COUNT; r++) {
    accentZ[r] += speed;
    if (accentZ[r] > RECYCLE_Z) accentZ[r] -= TOTAL_RING_LEN;
    accentRings[r].position.z = accentZ[r];
  }

  // ── Update point positions + colors ───────────────────────────────────────
  const posAttr = tunnelGeo.attributes.position;
  const colAttr = tunnelGeo.attributes.color;

  for (let s = 0; s < SEGMENT_COUNT; s++) {
    const z = segZ[s];

    // Depth 0 = far ahead, 1 = just before camera
    const depthT = 1.0 - Math.max(0, Math.min(1, -z / TOTAL_LEN));

    // Radius breathes: the tube constricts and expands along its length + time
    const radiusMod = 1.0 + noise.noise(z * 0.07, noiseT * 0.10, 0.0) * 0.30;

    for (let i = 0; i < RING_POINTS; i++) {
      const idx   = s * RING_POINTS + i;
      const angle = (i / RING_POINTS) * Math.PI * 2;

      // Base circle
      const r  = TUNNEL_RADIUS * radiusMod;
      const bx = Math.cos(angle) * r;
      const by = Math.sin(angle) * r;

      // Noise writh — tube twists as the Z+time changes
      const nx = noise.noise(bx * NOISE_FREQ,      z * 0.09,      noiseT * 0.4) * NOISE_AMP;
      const ny = noise.noise(by * NOISE_FREQ + 50, z * 0.09 + 20, noiseT * 0.4) * NOISE_AMP;

      posAttr.setXYZ(idx, bx + nx, by + ny, z);

      // Color: depth gradient + per-point noise variation
      const colorVar = noise.noise(bx * 0.10, by * 0.10, noiseT * 0.25) * 0.22;
      const c = depthColor(Math.max(0, Math.min(1, depthT + colorVar)));
      colAttr.setXYZ(idx, c.r, c.g, c.b);
    }
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;

  // Noise time advances proportional to speed → faster scroll = more chaos
  noiseT += speed * 0.32;
  scrollVelocity *= 0.91;
}

// ── Render loop ───────────────────────────────────────────────────────────────
startRenderLoop(clock, (delta, elapsed) => {
  updateTunnel();
  updateGlitch(delta);

  // Camera serpentine — figure-8 drift, amplitude spikes during glitch
  const amp = 0.55 + glitchIntensity * 0.45;
  camera.position.x = Math.sin(elapsed * 0.38) * amp;
  camera.position.y = Math.cos(elapsed * 0.29) * amp * 0.65;

  // Accent ring opacity: gentle pulse + glitch spike
  for (let r = 0; r < RING_COUNT; r++) {
    accentRings[r].material.opacity =
      0.25 + Math.sin(elapsed * 1.1 + r * 0.9) * 0.10 + glitchIntensity * 0.35;
  }

  composer.render(delta);
});
