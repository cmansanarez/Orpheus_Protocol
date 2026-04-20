/**
 * echo.js — PAGE 2B: The Echo  (echo_basin.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Luminous basin of suspended memory-motes.
 *   • 220 firefly motes — three InstancedMesh layers:
 *       core (IcosahedronGeometry level 0, bright nucleus)
 *       glow1 (~3× core, additive 30%, inner halo)
 *       glow2 (~7× core, additive  9%, outer breath)
 *   • Buoyant sine float + slow XZ drift (per-mote phase / speed)
 *   • Mic-reactive: glow radius expands, bloom rises, ripple rings on pool floor
 *   • Abstract floor — faint reflective pool + subtle grid
 *   • Post: UnrealBloomPass (1.8) + AfterimagePass (0.84)
 *   • Palette: void black · signal cyan · fragment magenta · rare noise violet
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass }  from 'three/addons/postprocessing/AfterimagePass.js';

import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';
import { MicInput }                          from '../utils/MicInput.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const MOTE_COUNT  = 220;
const CAM_Z_START = 0;
const CAM_Z_END   = -40;
const FLOAT_AMP   = 0.35;   // Y sine-float amplitude (world units)

// Palette
const C_SIGNAL   = new THREE.Color(0x00ffe1);  // cyan
const C_FRAGMENT = new THREE.Color(0xff00c8);  // magenta
const C_NOISE    = new THREE.Color(0x3d00ff);  // violet (rare)
const C_WHITE    = new THREE.Color(0xffffff);

// ── Scene ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, scene, camera, clock } = createThreeScene(canvas, {
  fov: 65, far: 200, background: new THREE.Color(0x000000),
});

// ── Post-Processing ───────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.8, 0.55, 0.06
);
composer.addPass(bloom);
composer.addPass(new AfterimagePass(0.84));
window.addEventListener('resize', () =>
  composer.setSize(window.innerWidth, window.innerHeight));

// ── Floor — faint reflective pool suggestion ──────────────────────────────────
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshBasicMaterial({ color: 0x001520, transparent: true, opacity: 0.15 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -4.5;
scene.add(floor);

const grid = new THREE.GridHelper(50, 24, 0x00334d, 0x001a28);
grid.position.y = -4.48;
grid.material.transparent = true;
grid.material.opacity     = 0.10;
scene.add(grid);

// ── Mote Data ─────────────────────────────────────────────────────────────────
const restX      = new Float32Array(MOTE_COUNT);
const restY      = new Float32Array(MOTE_COUNT);
const restZ      = new Float32Array(MOTE_COUNT);
const phase      = new Float32Array(MOTE_COUNT);
const floatSpd   = new Float32Array(MOTE_COUNT);
const driftAngle = new Float32Array(MOTE_COUNT);
const driftR     = new Float32Array(MOTE_COUNT);
const driftSpd   = new Float32Array(MOTE_COUNT);
const moteCol    = [];   // THREE.Color per mote (static, set once)

for (let i = 0; i < MOTE_COUNT; i++) {
  // XZ — polar scatter, power-curve bias toward centre
  const r     = 2.5 + Math.pow(Math.random(), 0.55) * 15;
  const theta = Math.random() * Math.PI * 2;
  restX[i] = r * Math.cos(theta);
  restZ[i] = -3 - Math.random() * 40;   // covers full scroll depth Z 0→-40

  // Y — basin-shape: most motes hover near floor, a few float high
  restY[i] = -3.8 + Math.pow(Math.random(), 1.7) * 9;

  phase[i]      = Math.random() * Math.PI * 2;
  floatSpd[i]   = 0.16 + Math.random() * 0.28;   // 15–40 s float period
  driftAngle[i] = Math.random() * Math.PI * 2;
  driftR[i]     = 0.05 + Math.random() * 0.22;
  driftSpd[i]   = 0.03 + Math.random() * 0.10;

  // 70 % cyan · 22 % magenta · 8 % violet
  const t = Math.random();
  moteCol.push(
    t < 0.70  ? C_SIGNAL.clone()
    : t < 0.92 ? C_FRAGMENT.clone()
    :             C_NOISE.clone()
  );
}

// ── Firefly Instanced Meshes (3 layers) ───────────────────────────────────────
const dummy = new THREE.Object3D();

const coreMesh = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(0.040, 0),
  new THREE.MeshBasicMaterial(),
  MOTE_COUNT
);
const glow1Mesh = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(0.115, 1),
  new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.30,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }),
  MOTE_COUNT
);
const glow2Mesh = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(0.270, 1),
  new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.09,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }),
  MOTE_COUNT
);

// Assign per-instance colours once at init
{
  const tmp = new THREE.Color();
  for (let i = 0; i < MOTE_COUNT; i++) {
    tmp.copy(moteCol[i]).lerp(C_WHITE, 0.55);   // core: colour + white blend → bright nucleus
    coreMesh.setColorAt(i,  tmp);
    glow1Mesh.setColorAt(i, moteCol[i]);
    glow2Mesh.setColorAt(i, moteCol[i]);

    // Initialise all matrices to origin so nothing renders at world-zero before first frame
    dummy.position.set(0, -1000, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    coreMesh.setMatrixAt(i,  dummy.matrix);
    glow1Mesh.setMatrixAt(i, dummy.matrix);
    glow2Mesh.setMatrixAt(i, dummy.matrix);
  }
  coreMesh.instanceColor.needsUpdate  = true;
  glow1Mesh.instanceColor.needsUpdate = true;
  glow2Mesh.instanceColor.needsUpdate = true;
}

scene.add(coreMesh, glow1Mesh, glow2Mesh);

// ── Ripple Ring Pool ──────────────────────────────────────────────────────────
// 3 pooled rings on the floor plane — triggered on loud mic input
const ripples = Array.from({ length: 3 }, () => {
  const mat  = new THREE.MeshBasicMaterial({
    color: 0x00ffe1, side: THREE.DoubleSide,
    transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.9, 48), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -4.3;
  mesh.visible    = false;
  scene.add(mesh);
  return { mesh, mat, active: false, scale: 0, opacity: 0 };
});
let rippleCooldown = 0;

// ── Microphone ────────────────────────────────────────────────────────────────
const mic    = new MicInput({ fftSize: 512, smoothing: 0.82 });
const micBtn = document.getElementById('mic-btn');

// Silently restore mic if already granted on a previous scene
const _autoMicOk = await mic.autoInit();
if (_autoMicOk && micBtn) micBtn.style.display = 'none';
if (micBtn && !_autoMicOk) {
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

// ── State ─────────────────────────────────────────────────────────────────────
let glowPulse = 0;

// ── Render Loop ───────────────────────────────────────────────────────────────
startRenderLoop(clock, (delta, elapsed) => {
  const micLevel = mic.getLevel();

  // Glow pulse: snaps up with mic level, decays ~10 %/frame (~0.14 s half-life at 60 fps)
  glowPulse = Math.max(glowPulse * 0.90, micLevel);

  // ── Mote matrices ────────────────────────────────────────────────────────
  for (let i = 0; i < MOTE_COUNT; i++) {
    driftAngle[i] += delta * driftSpd[i];

    const px = restX[i] + Math.cos(driftAngle[i]) * driftR[i];
    const py = restY[i] + Math.sin(elapsed * floatSpd[i] + phase[i]) * FLOAT_AMP;
    const pz = restZ[i] + Math.sin(driftAngle[i] * 0.7) * driftR[i];

    dummy.position.set(px, py, pz);

    // Core — no mic scale (keep nucleus crisp)
    dummy.scale.setScalar(1.0);
    dummy.updateMatrix();
    coreMesh.setMatrixAt(i, dummy.matrix);

    // Inner glow — expands gently with mic
    dummy.scale.setScalar(1.0 + glowPulse * 0.65);
    dummy.updateMatrix();
    glow1Mesh.setMatrixAt(i, dummy.matrix);

    // Outer halo — expands more dramatically with mic
    dummy.scale.setScalar(1.0 + glowPulse * 1.30);
    dummy.updateMatrix();
    glow2Mesh.setMatrixAt(i, dummy.matrix);
  }
  coreMesh.instanceMatrix.needsUpdate  = true;
  glow1Mesh.instanceMatrix.needsUpdate = true;
  glow2Mesh.instanceMatrix.needsUpdate = true;

  // ── Bloom ────────────────────────────────────────────────────────────────
  bloom.strength = 1.8 + glowPulse * 1.4;

  // ── Ripple rings (floor pool) ─────────────────────────────────────────────
  rippleCooldown = Math.max(0, rippleCooldown - delta);
  if (micLevel > 0.30 && rippleCooldown <= 0) {
    const idle = ripples.find(r => !r.active);
    if (idle) {
      idle.active       = true;
      idle.scale        = 0.6;
      idle.opacity      = 0.55;
      idle.mesh.visible = true;
      rippleCooldown    = 0.55;
    }
  }
  for (const rip of ripples) {
    if (!rip.active) continue;
    rip.scale   += delta * 5.5;
    rip.opacity -= delta * 1.0;
    rip.mesh.scale.setScalar(rip.scale);
    rip.mat.opacity = Math.max(0, rip.opacity);
    if (rip.opacity <= 0) { rip.active = false; rip.mesh.visible = false; }
  }

  // ── Camera — very gentle breathe (calm scene, not aggressive) ─────────────
  // Z is controlled by ScrollNarrative; X/Y drift softly
  camera.position.x = Math.sin(elapsed * 0.09) * 0.18;
  camera.position.y = Math.cos(elapsed * 0.07) * 0.10 - 0.5;

  composer.render(delta);
});
