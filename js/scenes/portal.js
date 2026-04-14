/**
 * portal.js — PAGE 5: The Portal  (portal.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Digital black-box theatre. A 30-unit cube in void space, orbiting like a
 * holy relic. The user moves the camera around the cube in all 3 dimensions.
 *
 * Controls:
 *   Mouse / touch drag  — orbit camera around cube (spherical theta/phi)
 *   Scroll wheel        — scale the cube (0.3× – 3.0×)
 *   Mic button          — optional audio reactivity for Hydra sketches
 *
 * Faces:
 *   Exterior (6)  — Hydra sketches 1–6 as CanvasTexture
 *   Interior (6)  — flat black
 *
 * Audio:
 *   window.a shim (24 bins) populated from MicInput each frame.
 *   All Hydra lambdas read it live; setBins() is a no-op to keep 24 bins for
 *   every sketch regardless of individual calls to a.setBins(n).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';
import { MicInput }                          from '../utils/MicInput.js';
import { HydraManager }                      from '../utils/HydraManager.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const CUBE_SIZE  = 30;
const ORBIT_R    = 55;     // camera distance from origin
const AUTO_SPEED = 0.18;   // rad/s — auto-orbit when not dragging
const DRAG_SENS  = 0.005;  // radians per pixel
const SCALE_MIN  = 0.3;
const SCALE_MAX  = 3.0;
const SCALE_STEP = 0.08;   // per normalised wheel tick

// ── Audio shim — installed before any Hydra instance ─────────────────────────
window.a = {
  fft: new Array(24).fill(0),
  setSmooth(v) {},
  setScale(v)  {},
  setCutoff(v) {},
  setBins(n)   {},   // intentional no-op: keep 24 bins for all sketches
  show()       {},
};

// ── Scene ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, scene, camera, clock } = createThreeScene(canvas, {
  fov: 60, far: 500, background: new THREE.Color(0x000000),
});

// ── Mic (audio reactivity — optional) ────────────────────────────────────────
const mic    = new MicInput({ fftSize: 1024, smoothing: 0.8 });
const micBtn = document.getElementById('mic-btn');
if (micBtn) {
  micBtn.addEventListener('click', async () => {
    const ok = await mic.init();
    if (ok) micBtn.style.display = 'none';
  }, { once: true });
}

// ── Hydra Manager + sketch loader ─────────────────────────────────────────────
const manager = new HydraManager(mic);
await manager.init(6);   // 6 exterior face canvases

async function fetchSketch(path) {
  try {
    const res  = await fetch(path);
    let   text = await res.text();
    if (text.trim().length < 10) return null;
    // Strip any loadScript() calls — external libs are pre-loaded via <script> tags
    text = text.replace(/await\s+loadScript\s*\([^)]+\)\s*\n?/g, '');
    return text;
  } catch {
    console.warn('[Portal] Could not load:', path);
    return null;
  }
}

function fallbackSketch() {
  noise(2, 0.1).color(0, 0.04, 0.08).out(o0);
}

const SKETCH_PATHS = [
  'assets/sketches/hydra1.js',   // face 0  +X
  'assets/sketches/hydra2.js',   // face 1  -X
  'assets/sketches/hydra3.js',   // face 2  +Y
  'assets/sketches/hydra4.js',   // face 3  -Y
  'assets/sketches/hydra5.js',   // face 4  +Z
  'assets/sketches/hydra6.js',   // face 5  -Z
];

for (let i = 0; i < 6; i++) {
  const code = await fetchSketch(SKETCH_PATHS[i]);
  manager.initSketch(i, code
    ? () => { (new Function(code))(); }
    : fallbackSketch
  );
}

// ── Cube group (scale is applied here) ───────────────────────────────────────
const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

// Exterior: Hydra CanvasTexture per face
const extTextures = Array.from({ length: 6 }, (_, i) =>
  new THREE.CanvasTexture(manager.getCanvas(i))
);
const exteriorCube = new THREE.Mesh(
  new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
  extTextures.map(tex =>
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide })
  )
);
cubeGroup.add(exteriorCube);

// Interior: flat black, BackSide
const interiorCube = new THREE.Mesh(
  new THREE.BoxGeometry(CUBE_SIZE * 0.995, CUBE_SIZE * 0.995, CUBE_SIZE * 0.995),
  Array.from({ length: 6 }, () =>
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
  )
);
cubeGroup.add(interiorCube);

// Cyan edge overlay — the relic's skeleton
const edgeMesh = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)),
  new THREE.LineBasicMaterial({ color: 0x00ffe1, transparent: true, opacity: 0.35 })
);
cubeGroup.add(edgeMesh);

// ── Spherical orbit state ─────────────────────────────────────────────────────
//   theta = azimuth (horizontal), phi = elevation (vertical)
//   Camera position: standard spherical → Cartesian
//     x = R * sin(phi) * sin(theta)
//     y = R * cos(phi)
//     z = R * sin(phi) * cos(theta)
let theta      = 0;
let phi        = Math.PI / 3.5;   // start slightly above equator
let isDragging = false;
let lastX      = 0;
let lastY      = 0;

// Cube scale (scroll-driven)
let cubeScale   = 1.0;
let targetScale = 1.0;

// ── Mouse drag ────────────────────────────────────────────────────────────────
canvas.style.cursor = 'grab';

canvas.addEventListener('mousedown', e => {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  theta -= dx * DRAG_SENS;
  phi   -= dy * DRAG_SENS;
  phi    = Math.max(0.08, Math.min(Math.PI - 0.08, phi));
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  canvas.style.cursor = 'grab';
});

// ── Touch drag ────────────────────────────────────────────────────────────────
canvas.addEventListener('touchstart', e => {
  const t = e.touches[0];
  isDragging = true;
  lastX = t.clientX;
  lastY = t.clientY;
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const t = e.touches[0];
  const dx = t.clientX - lastX;
  const dy = t.clientY - lastY;
  lastX = t.clientX;
  lastY = t.clientY;
  theta -= dx * DRAG_SENS;
  phi   -= dy * DRAG_SENS;
  phi    = Math.max(0.08, Math.min(Math.PI - 0.08, phi));
}, { passive: true });

window.addEventListener('touchend', () => { isDragging = false; });

// ── Scroll → cube scale ───────────────────────────────────────────────────────
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const dir = e.deltaY > 0 ? -1 : 1;
  targetScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, targetScale + dir * SCALE_STEP));
}, { passive: false });

// ── ScrollNarrative (beats independent of camera) ────────────────────────────
const scroll = new ScrollNarrative({
  sensitivity: 0.00028,
  smoothing:   0.06,
  onProgress: (p) => {
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = (p * 100) + '%';
  },
});
scroll.loadBeatsFromDOM().start();

// ── Render loop ───────────────────────────────────────────────────────────────
startRenderLoop(clock, (delta, elapsed) => {

  // FFT shim: map MicInput into window.a.fft (24 bins)
  if (mic.ready) {
    const raw = mic.getFFT();
    for (let i = 0; i < 24; i++) {
      window.a.fft[i] = raw[Math.floor(i * raw.length / 24)] / 255;
    }
  }

  // Mark all Hydra textures dirty
  for (const tex of extTextures) tex.needsUpdate = true;

  // Auto-orbit when not dragging — the holy-relic idle drift
  if (!isDragging) theta += delta * AUTO_SPEED;

  // Spherical → Cartesian camera position; always looks at origin
  camera.position.set(
    ORBIT_R * Math.sin(phi) * Math.sin(theta),
    ORBIT_R * Math.cos(phi),
    ORBIT_R * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0, 0);

  // Smooth cube scale lerp
  cubeScale += (targetScale - cubeScale) * 0.08;
  cubeGroup.scale.setScalar(cubeScale);

  // Edge pulse
  edgeMesh.material.opacity = 0.20 + Math.sin(elapsed * 0.9) * 0.12;

  renderer.render(scene, camera);
});
