/**
 * portal.js — PAGE 5: The Portal  (portal.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Digital black-box theatre. A 30-unit cube in void space.
 *
 * Controls:
 *   Mouse / touch drag  — orbit camera around cube (spherical theta/phi)
 *                         Release launches with momentum; decays to auto-orbit.
 *   Scroll wheel        — scale the cube (0.3× – 3.0×)
 *   Mic button          — optional audio reactivity for Hydra sketches
 *                         Auto-skipped if mic was already granted this session.
 *
 * Camera states:
 *   DRAG        — user is actively dragging; theta/phi set directly
 *   COAST       — user released; thetaVel/phiVel applied + decayed each frame
 *   AUTO-ORBIT  — velocity dead; theta auto-advances, phi oscillates with sin()
 *
 * Faces:
 *   Exterior (6)  — Hydra sketches 1–6 as CanvasTexture
 *   Interior (6)  — flat black
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';
import { MicInput }                          from '../utils/MicInput.js';
import { HydraManager }                      from '../utils/HydraManager.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const CUBE_SIZE  = 30;
const ORBIT_R    = 55;       // camera distance from origin
const DRAG_SENS  = 0.005;    // radians per pixel dragged
const SCALE_MIN  = 0.3;
const SCALE_MAX  = 3.0;
const SCALE_STEP = 0.08;
const PHI_REST   = Math.PI * 0.50;  // equatorial start — drift covers top + bottom
const AUTO_SPEED = 0.18;            // auto-orbit theta rate rad/s
const DECAY      = 2.8;             // exponential velocity decay constant (per sec)
const VEL_DEAD   = 0.00015;         // velocity threshold below which auto-orbit kicks in

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

// ── Mic — auto-init if previously granted, otherwise gate behind button ───────
const mic    = new MicInput({ fftSize: 1024, smoothing: 0.8 });
const micBtn = document.getElementById('mic-btn');

const _autoMicOk = await mic.autoInit();
if (_autoMicOk && micBtn) micBtn.style.display = 'none';
if (micBtn && !_autoMicOk) {
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

// ── Cube group (scale applied here) ───────────────────────────────────────────
const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

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

const interiorCube = new THREE.Mesh(
  new THREE.BoxGeometry(CUBE_SIZE * 0.995, CUBE_SIZE * 0.995, CUBE_SIZE * 0.995),
  Array.from({ length: 6 }, () =>
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
  )
);
cubeGroup.add(interiorCube);

const edgeMesh = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)),
  new THREE.LineBasicMaterial({ color: 0x00ffe1, transparent: true, opacity: 0.35 })
);
cubeGroup.add(edgeMesh);

// ── Orbit state (spherical coordinates) ───────────────────────────────────────
//   Camera position: x = R*sin(phi)*sin(theta)  y = R*cos(phi)  z = R*sin(phi)*cos(theta)
let theta      = 0;
let phi        = PHI_REST;
let isDragging = false;
let lastX      = 0, lastY = 0;
let lastDragDx = 0, lastDragDy = 0;   // most recent drag delta for launch velocity
let thetaVel   = 0;                    // angular velocity (rad/frame)
let phiVel     = 0;

// Scale
let cubeScale   = 1.0;
let targetScale = 1.0;

// ── Mouse drag ────────────────────────────────────────────────────────────────
canvas.style.cursor = 'grab';

canvas.addEventListener('mousedown', e => {
  isDragging = true;
  lastX = e.clientX; lastY = e.clientY;
  lastDragDx = 0; lastDragDy = 0;
  thetaVel = 0; phiVel = 0;   // cancel any coast in progress
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  lastDragDx = dx; lastDragDy = dy;
  theta -= dx * DRAG_SENS;
  phi   -= dy * DRAG_SENS;
  phi    = Math.max(0.08, Math.min(Math.PI - 0.08, phi));
});

window.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  // Launch with the velocity of the final drag movement
  thetaVel = -lastDragDx * DRAG_SENS;
  phiVel   = -lastDragDy * DRAG_SENS;
  canvas.style.cursor = 'grab';
});

// ── Touch drag ────────────────────────────────────────────────────────────────
canvas.addEventListener('touchstart', e => {
  const t = e.touches[0];
  isDragging = true;
  lastX = t.clientX; lastY = t.clientY;
  lastDragDx = 0; lastDragDy = 0;
  thetaVel = 0; phiVel = 0;
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const t = e.touches[0];
  const dx = t.clientX - lastX;
  const dy = t.clientY - lastY;
  lastX = t.clientX; lastY = t.clientY;
  lastDragDx = dx; lastDragDy = dy;
  theta -= dx * DRAG_SENS;
  phi   -= dy * DRAG_SENS;
  phi    = Math.max(0.08, Math.min(Math.PI - 0.08, phi));
}, { passive: true });

window.addEventListener('touchend', () => {
  if (!isDragging) return;
  isDragging = false;
  thetaVel = -lastDragDx * DRAG_SENS;
  phiVel   = -lastDragDy * DRAG_SENS;
});

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

  // Mark all Hydra textures dirty each frame
  for (const tex of extTextures) tex.needsUpdate = true;

  // ── Camera: coast → auto-orbit ──────────────────────────────────────────────
  if (!isDragging) {
    // Frame-rate-independent exponential velocity decay
    const decay = Math.exp(-delta * DECAY);
    thetaVel *= decay;
    phiVel   *= decay;

    theta += thetaVel;
    phi   += phiVel;

    // When momentum has died, switch to auto-orbit
    if (Math.abs(thetaVel) + Math.abs(phiVel) < VEL_DEAD) {
      thetaVel = 0;
      phiVel   = 0;
      // Auto-advance theta + gently restore phi to sinusoidal path
      theta += delta * AUTO_SPEED;
      // Velocity-based sine drift — no restoring force, no lock point.
      // Integrates to ±0.71 rad oscillation (~41°) over ~45 s period.
      phi += Math.sin(elapsed * 0.14) * delta * 0.10;
    }

    phi = Math.max(0.08, Math.min(Math.PI - 0.08, phi));
  }

  // Spherical → Cartesian; camera always looks at origin
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
