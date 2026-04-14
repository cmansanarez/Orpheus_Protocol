/**
 * fracture.js — PAGE 2A: The Fracture  (glitch_tunnel.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual concept: Forward-travelling wireframe / point-cloud tunnel.
 *   • Repeated tunnel segments recycled as they pass the camera (wormhole loop)
 *   • RGB offset flicker + glitch pulse driven by time and scroll speed
 *   • Scroll drives camera or segment velocity (cinematic forward travel)
 *   • Neon cyan / magenta / electric-blue palette on deep black
 *   • Text planes encountered as landmarks rather than read top-down
 *
 * Reference architecture: Bobby Roe — wormhole-effect & flythru-wireframe-wormhole
 * https://github.com/bobbyroe/wormhole-effect
 * https://github.com/bobbyroe/flythru-wireframe-wormhole
 *
 * Build status: SCAFFOLD ✦ Placeholder tube geometry. Full visuals pending.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const SEGMENT_COUNT  = 12;
const SEGMENT_LENGTH = 20;
const TUBE_RADIUS    = 5;
const TRAVEL_SPEED   = 0.05;   // base units per frame (scaled by scroll velocity)
const CAM_FOV        = 80;

// ── Scene ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, scene, camera, clock } = createThreeScene(canvas, {
  fov:        CAM_FOV,
  far:        500,
  background: new THREE.Color(0x000000),
});

// ── Lighting ──────────────────────────────────────────────────────────────────
// The Fracture is dark — rely on emissive materials, no ambient fill.
const glowLight = new THREE.PointLight(0x3d00ff, 1.2, 40);
glowLight.position.set(0, 0, -5);
scene.add(glowLight);

// ── Tunnel Segments ───────────────────────────────────────────────────────────
// TODO: Replace cylinder wireframe with deformed point-cloud geometry:
//   1. CylinderGeometry → displace vertices with ImprovedNoise (like wormhole-effect)
//   2. Convert to BufferGeometry, store vertex colours (cyan → magenta gradient)
//   3. Render as THREE.Points with PointsMaterial for the wormhole feel
//   4. RGB offset: render a second slightly-offset copy with a screen blend
//   5. Glitch pulse: every N frames, translate a slice of vertices by random amount

const segments = [];
const segGeo = new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, SEGMENT_LENGTH, 24, 8, true);
const segMat = new THREE.MeshBasicMaterial({
  color:      0x00ffe1,
  wireframe:  true,
  transparent: true,
  opacity:    0.25,
});

for (let i = 0; i < SEGMENT_COUNT; i++) {
  const mesh = new THREE.Mesh(segGeo, segMat.clone());
  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = -i * SEGMENT_LENGTH;
  segments.push(mesh);
  scene.add(mesh);
}

// ── Scroll Narrative ──────────────────────────────────────────────────────────
let scrollVelocity = 0;
let lastProgress   = 0;

const scroll = new ScrollNarrative({
  sensitivity: 0.00030,
  smoothing:   0.08,
  onProgress:  (p) => {
    scrollVelocity = Math.abs(p - lastProgress) * 60; // normalise to per-frame
    lastProgress   = p;
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = (p * 100) + '%';
    if (p > 0.02) document.getElementById('scroll-hint')?.classList.add('hidden');
  },
});
scroll.loadBeatsFromDOM().start();

// ── Render Loop ───────────────────────────────────────────────────────────────
startRenderLoop(clock, (delta, elapsed) => {
  const speed = TRAVEL_SPEED + scrollVelocity * 2;
  scrollVelocity *= 0.9;   // decay scroll impulse

  // Move segments toward camera, recycle at back
  segments.forEach((seg) => {
    seg.position.z += speed;
    if (seg.position.z > SEGMENT_LENGTH) {
      seg.position.z -= SEGMENT_COUNT * SEGMENT_LENGTH;
    }
  });

  // Subtle colour flicker — TODO: replace with shader-based RGB offset
  const flicker = 0.15 + Math.sin(elapsed * 8 + Math.random() * 0.1) * 0.1;
  segments.forEach((seg) => { seg.material.opacity = flicker; });

  // Camera slight serpentine for corridor energy
  camera.position.x = Math.sin(elapsed * 0.4) * 0.5;
  camera.position.y = Math.cos(elapsed * 0.3) * 0.3;

  renderer.render(scene, camera);
});
