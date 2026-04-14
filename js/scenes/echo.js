/**
 * echo.js — PAGE 2B: The Echo  (echo_basin.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual concept: Luminous basin of suspended memory particles.
 *   • Firefly-style motes — core mesh + concentric soft-glow layers
 *   • Gentle buoyant float motion (no aggressive velocity)
 *   • Subtle mic reactivity: louder input → brighter motes, wider ripple
 *   • Possible faint reflective floor suggestion (abstract, not photorealistic)
 *   • Palette: high black levels, soft cyan/fragment glow, melancholy mood
 *
 * Reference architecture: Bobby Roe — fireflies/floating
 * https://github.com/bobbyroe/fireflies/tree/floating
 *
 * Build status: SCAFFOLD ✦ Simple Points cloud. Full firefly glow pending.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';
import { MicInput }                          from '../utils/MicInput.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const MOTE_COUNT    = 320;
const CAM_Z_START   =  0;
const CAM_Z_END     = -40;

// ── Scene ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, scene, camera, clock } = createThreeScene(canvas, {
  fov: 65,
  far: 200,
  background: new THREE.Color(0x000000),
});

// ── Post-Processing ───────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.6, 0.6, 0.1
);
composer.addPass(bloom);
window.addEventListener('resize', () => composer.setSize(window.innerWidth, window.innerHeight));

// ── Lighting ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x000508, 1.0));

// ── Mote Particle System ──────────────────────────────────────────────────────
// TODO: Upgrade to firefly architecture:
//   Each mote = IcosahedronGeometry (core) + 2–3 larger transparent glow meshes
//   (MeshBasicMaterial, additive blending, scale: 1x, 2x, 4x)
//   Reference: Bobby Roe fireflies/floating — getBgSphere not needed, just the
//   firefly construction pattern.
//
// Current placeholder: simple Points cloud with varying brightness.

const motePosArr = new Float32Array(MOTE_COUNT * 3);
const moteColArr = new Float32Array(MOTE_COUNT * 3);
const motePhase  = new Float32Array(MOTE_COUNT);
const moteSpeed  = new Float32Array(MOTE_COUNT);

for (let i = 0; i < MOTE_COUNT; i++) {
  const r = 4 + Math.random() * 18;
  const theta = Math.random() * Math.PI * 2;
  const phi   = (Math.random() - 0.5) * Math.PI * 0.6;
  motePosArr[i * 3]     = r * Math.cos(theta) * Math.cos(phi);
  motePosArr[i * 3 + 1] = r * Math.sin(phi) * 0.5 - 2;
  motePosArr[i * 3 + 2] = -5 - Math.random() * 25;

  // Cyan-to-fragment gradient
  const t = Math.random();
  moteColArr[i * 3]     = t * 1.0;                  // R
  moteColArr[i * 3 + 1] = (1 - t) * 1.0;            // G
  moteColArr[i * 3 + 2] = 1.0 - t * 0.2;            // B

  motePhase[i] = Math.random() * Math.PI * 2;
  moteSpeed[i] = 0.2 + Math.random() * 0.4;
}

const moteGeo = new THREE.BufferGeometry();
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePosArr, 3));
moteGeo.setAttribute('color',    new THREE.BufferAttribute(moteColArr, 3));

const moteMat = new THREE.PointsMaterial({
  size:          0.18,
  vertexColors:  true,
  transparent:   true,
  opacity:       0.9,
  blending:      THREE.AdditiveBlending,
  depthWrite:    false,
  sizeAttenuation: true,
});

const motes = new THREE.Points(moteGeo, moteMat);
scene.add(motes);

// ── Microphone ────────────────────────────────────────────────────────────────
const mic = new MicInput({ fftSize: 512, smoothing: 0.85 });

// Mic is optional — show a prompt button, init on click
const micBtn = document.getElementById('mic-btn');
if (micBtn) {
  micBtn.addEventListener('click', async () => {
    const ok = await mic.init();
    if (ok) micBtn.style.display = 'none';
  }, { once: true });
}

// ── Scroll Narrative ──────────────────────────────────────────────────────────
const scroll = new ScrollNarrative({
  sensitivity: 0.00026,
  smoothing:   0.055,
  onProgress: (p) => {
    camera.position.z = CAM_Z_START + (CAM_Z_END - CAM_Z_START) * p;
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = (p * 100) + '%';
    if (p > 0.02) document.getElementById('scroll-hint')?.classList.add('hidden');
  },
});
scroll.loadBeatsFromDOM().start();

// ── Render Loop ───────────────────────────────────────────────────────────────
const posAttr = moteGeo.getAttribute('position');

startRenderLoop(clock, (delta, elapsed) => {
  const micLevel = mic.getLevel();

  // Float motes — buoyant sine drift
  for (let i = 0; i < MOTE_COUNT; i++) {
    posAttr.setY(i, motePosArr[i * 3 + 1]
      + Math.sin(elapsed * moteSpeed[i] + motePhase[i]) * (0.04 + micLevel * 0.12));
  }
  posAttr.needsUpdate = true;

  // Bloom reacts mildly to mic
  bloom.strength = 1.6 + micLevel * 1.2;

  // Gentle scene rotation for parallax
  motes.rotation.y += delta * 0.012;

  composer.render(delta);
});
