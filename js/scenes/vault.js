/**
 * vault.js — PAGE 3: The Vault  (vault.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Sacred computational chamber.
 *   • ImprovedNoise-deformed wireframe grid — architectural floor breathing slowly
 *   • 8 floating primitives in a symmetrical temple arrangement:
 *       paired matte spheres (entry)
 *       paired wireframe cubes (gateposts)
 *       central matte icosahedron (apex, elevated)
 *       paired cyan-signal wireframe octahedra (sparse accent)
 *       central wireframe torus (halo ring gate)
 *   • FogExp2 shrouds depth — underworld, not void
 *   • Very gentle camera drift + lookAt tracking
 *   • Bloom focused on cyan accents (threshold 0.18)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ImprovedNoise }   from 'three/addons/math/ImprovedNoise.js';

import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';
import { MicInput }                          from '../utils/MicInput.js';

// ── Constants ─────────────────────────────────────────────────────────────────────────────────
const CAM_Z_START = 0;
const CAM_Z_END   = -60;

// Noise grid parameters
const GRID_W      = 80;
const GRID_D      = 200;
const GRID_SEG_W  = 48;
const GRID_SEG_D  = 120;
const NOISE_FREQ  = 0.05;
const NOISE_AMP   = 0.55;   // very subtle — architectural, not terrain
const NOISE_SPEED = 0.048;  // slow breath

// ── Scene ───────────────────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, scene, camera, clock } = createThreeScene(canvas, {
  fov: 65, far: 250, background: new THREE.Color(0x000000),
});
camera.position.set(0, 3.5, 0);

// ── Fog ───────────────────────────────────────────────────────────────────────────────────────
// Exponential fog: ~37% visible at 45 units, ~14% at 90 units
scene.fog = new THREE.FogExp2(0x000000, 0.022);

// ── Post-Processing ───────────────────────────────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.90, 0.40, 0.18   // strength, radius, threshold
);
composer.addPass(bloom);
window.addEventListener('resize', () =>
  composer.setSize(window.innerWidth, window.innerHeight));

// ── Lighting ─────────────────────────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x07101a, 1.0));

// Vault spotlight — cold overhead, slightly angled forward
const vaultLight = new THREE.DirectionalLight(0xdde8f0, 0.55);
vaultLight.position.set(0, 30, -15);
scene.add(vaultLight);

// Flanking signal points — cyan, low intensity, cast ambient cyan wash
const sigA = new THREE.PointLight(0x00ffe1, 0.6, 80);
sigA.position.set(-18, 6, -25);
scene.add(sigA);
const sigB = new THREE.PointLight(0x00ffe1, 0.6, 80);
sigB.position.set( 18, 6, -25);
scene.add(sigB);

// Apex reactive light — hidden inside icosahedron, fires on loud mic input
const apexLight = new THREE.PointLight(0x00ffe1, 0, 70);
apexLight.position.set(0, 7.0, -30);
scene.add(apexLight);

// ── Noise Grid ─────────────────────────────────────────────────────────────────────────────────────
// PlaneGeometry is created in XY space, then rotated flat.
// After rotation.x = -PI/2: geometry X → world X, geometry Y → world -Z, geometry Z → world Y.
// We displace geometry Z each frame → world Y displacement (height).

const noiseGen    = new ImprovedNoise();
const gridGeo     = new THREE.PlaneGeometry(GRID_W, GRID_D, GRID_SEG_W, GRID_SEG_D);
const gridPosAttr = gridGeo.getAttribute('position');
const gridVertN   = gridPosAttr.count;

// Cache the rest-position XY (pre-displacement) for noise sampling
const gridRestXY = new Float32Array(gridVertN * 2);
for (let i = 0; i < gridVertN; i++) {
  gridRestXY[i * 2]     = gridPosAttr.getX(i);
  gridRestXY[i * 2 + 1] = gridPosAttr.getY(i);
}

const gridMesh = new THREE.Mesh(
  gridGeo,
  new THREE.MeshBasicMaterial({ color: 0x0d1e2b, wireframe: true })
);
gridMesh.rotation.x = -Math.PI / 2;
gridMesh.position.set(0, -5, -50);   // centred along the scroll path
scene.add(gridMesh);

// ── Primitive Materials ────────────────────────────────────────────────────────────────────────────────
const solidMat  = new THREE.MeshStandardMaterial({
  color: 0xb0bec5, roughness: 0.92, metalness: 0.0,
  transparent: true, opacity: 0.72,
});
const edgeMat   = new THREE.LineBasicMaterial({ color: 0x2a3d4d });
const wireMat   = new THREE.MeshBasicMaterial({ color: 0x3a5060, wireframe: true });
const signalMat = new THREE.MeshBasicMaterial({ color: 0x00ffe1, wireframe: true });

// ── Primitive Factory ──────────────────────────────────────────────────────────────────────────────────
// type 'matte'  — pale gray solid + EdgesGeometry overlay
// type 'wire'   — dark blue-gray wireframe only
// type 'signal' — cyan wireframe (sparse accent, 2 primitives total)
function addPrim(geo, x, restY, z, type, floatAmp, floatPhase) {
  const group = new THREE.Group();
  group.position.set(x, restY, z);

  if (type === 'matte') {
    group.add(new THREE.Mesh(geo, solidMat.clone()));
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat.clone()));
  } else if (type === 'wire') {
    group.add(new THREE.Mesh(geo, wireMat.clone()));
  } else {
    group.add(new THREE.Mesh(geo, signalMat.clone()));
  }

  group.userData = {
    restY,
    floatAmp,
    floatPhase,
    rotX: 0.06 + Math.random() * 0.06,
    rotY: 0.05 + Math.random() * 0.08,
  };
  scene.add(group);
  return group;
}

// ── Temple Arrangement ──────────────────────────────────────────────────────────────────────────────────
//  Z -10   Sphere pair     matte       entry pillars
//  Z -20   Cube pair       wire        inner gateposts
//  Z -30   Icosahedron     matte       temple apex (central, elevated)
//  Z -38   Octahedra pair  signal      cyan anchors (only cyan wireframe objects)
//  Z -48   Torus           wire        halo ring gate (central)

const prims = [
  // Entry pillars
  addPrim(new THREE.SphereGeometry(1.4, 20, 20), -7, 2.0, -10, 'matte', 0.22, 0.0),
  addPrim(new THREE.SphereGeometry(1.4, 20, 20),  7, 2.0, -10, 'matte', 0.22, Math.PI),

  // Gateposts
  addPrim(new THREE.BoxGeometry(2.2, 2.2, 2.2),  -9, 2.5, -20, 'wire', 0.18, 1.1),
  addPrim(new THREE.BoxGeometry(2.2, 2.2, 2.2),   9, 2.5, -20, 'wire', 0.18, 1.1 + Math.PI),

  // Apex — central, high
  addPrim(new THREE.IcosahedronGeometry(2.2, 1),  0, 7.0, -30, 'matte', 0.30, 0.5),

  // Signal anchors — only cyan wireframe in the scene
  addPrim(new THREE.OctahedronGeometry(1.6),     -8, 2.0, -38, 'signal', 0.20, 2.0),
  addPrim(new THREE.OctahedronGeometry(1.6),      8, 2.0, -38, 'signal', 0.20, 2.0 + Math.PI),

  // Halo ring gate — central
  addPrim(new THREE.TorusGeometry(3.5, 0.22, 12, 60), 0, 3.5, -48, 'wire', 0.15, 1.5),
];

// Tilt torus slightly so it reads as a ring and not a flat disc
prims[7].rotation.x = Math.PI * 0.12;

// ── Audio-reactive material references ───────────────────────────────────────
// Apex icosahedron (prims[4]) — MeshStandardMaterial supports emissive
const apexMesh = prims[4].children[0];
apexMesh.material.emissive.set(0x00ffe1);
apexMesh.material.emissiveIntensity = 0;

// Signal octahedra (prims[5], prims[6]) — MeshBasicMaterial color lerp
const octMatA  = prims[5].children[0].material;
const octMatB  = prims[6].children[0].material;
const SIG_REST = new THREE.Color(0x00ffe1);
const SIG_HOT  = new THREE.Color(0xffffff);

// ── Scroll Narrative ────────────────────────────────────────────────────────────────────────────────────
const scroll = new ScrollNarrative({
  sensitivity: 0.00028,
  smoothing:   0.06,
  onProgress: (p) => {
    camera.position.z = CAM_Z_START + (CAM_Z_END - CAM_Z_START) * p;
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = (p * 100) + '%';
    if (p > 0.02) document.getElementById('scroll-hint')?.classList.add('hidden');
  },
});
scroll.loadBeatsFromDOM().start();

// ── Microphone — silent auto-restore (permission granted on echo_basin) ──────
const mic = new MicInput({ fftSize: 512, smoothing: 0.82 });
await mic.autoInit();

// ── Render Loop ──────────────────────────────────────────────────────────────────────────────────────
let glowPulse = 0;
startRenderLoop(clock, (delta, elapsed) => {

  // ── Noise grid — displace Z (becomes world Y after rotation) ────────────────
  for (let i = 0; i < gridVertN; i++) {
    const gx = gridRestXY[i * 2];
    const gy = gridRestXY[i * 2 + 1];
    gridPosAttr.setZ(i,
      noiseGen.noise(
        gx * NOISE_FREQ + elapsed * NOISE_SPEED,
        gy * NOISE_FREQ,
        elapsed * 0.03
      ) * NOISE_AMP
    );
  }
  gridPosAttr.needsUpdate = true;

  // ── Primitives — float and rotate ────────────────────────────────────────────
  for (const prim of prims) {
    const { restY, floatAmp, floatPhase, rotX, rotY } = prim.userData;
    prim.position.y  = restY + Math.sin(elapsed * 0.28 + floatPhase) * floatAmp;
    prim.rotation.x += delta * rotX;
    prim.rotation.y += delta * rotY;
  }

  // ── Audio reactivity — three-tier response ────────────────────────────────
  const micLevel = mic.getLevel();
  // Snaps up instantly with mic, decays at ~88 % per frame (~0.12 s half-life)
  glowPulse = Math.max(glowPulse * 0.88, micLevel);

  // Tier 1 — flanking signal lights pulse from any mic input
  sigA.intensity = 0.6 + glowPulse * 3.0;
  sigB.intensity = 0.6 + glowPulse * 3.0;

  // Tier 2 — signal octahedra: scale up + colour drifts toward white
  const octPulse = Math.max(0, glowPulse - 0.05) * 1.4;
  const octScale = 1.0 + octPulse * 0.25;
  prims[5].scale.setScalar(octScale);
  prims[6].scale.setScalar(octScale);
  octMatA.color.lerpColors(SIG_REST, SIG_HOT, Math.min(1, octPulse * 1.8));
  octMatB.color.lerpColors(SIG_REST, SIG_HOT, Math.min(1, octPulse * 1.8));

  // Tier 3 — apex heartbeat: emissive glow + hidden point light fires at peaks
  const apexPulse = Math.max(0, glowPulse - 0.20) * 2.5;
  apexMesh.material.emissiveIntensity = Math.min(0.9, apexPulse * 0.9);
  apexLight.intensity                 = apexPulse * 4.5;

  // Bloom rises across all tiers
  bloom.strength = 0.90 + glowPulse * 1.5;

  // ── Camera — gentle drift, always faces forward down Z ──────────────────────
  // Z is controlled by ScrollNarrative
  camera.position.x = Math.sin(elapsed * 0.05) * 1.0;
  camera.position.y = 3.5 + Math.sin(elapsed * 0.08) * 0.3;
  // Slight left-right tracking with camera drift; 0.2x means mostly centred
  camera.lookAt(
    camera.position.x * 0.2,
    0.0,
    camera.position.z - 15
  );

  composer.render(delta);
});
