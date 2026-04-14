/**
 * vault.js — PAGE 3: The Vault  (vault.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual concept: Sacred computational chamber.
 *   • Procedural noise grid as the floor / ground plane (noise-grid reference)
 *   • Floating primitives: spheres, cubes, planes, torus — slowly ceremonial
 *   • Mostly wireframe or flat matte — white/gray palette, minimal colour
 *   • Sparse signal accent (cyan edges only), no glitch
 *   • Key line: "The Archive was never a storage system. It was a performance
 *     system." — must be visually emphasised by the beat system
 *
 * Reference architecture: Bobby Roe — noise-grid
 * https://github.com/bobbyroe/noise-grid
 *
 * Build status: SCAFFOLD ✦ Flat grid placeholder. Noise deformation + primitives pending.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const CAM_Z_START =  0;
const CAM_Z_END   = -60;

// ── Scene ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, scene, camera, clock } = createThreeScene(canvas, {
  fov:        65,
  far:        300,
  background: new THREE.Color(0x000000),
});
camera.position.set(0, 4, 0);
camera.lookAt(0, 0, -20);

// ── Post-Processing ───────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.7, 0.4, 0.3   // subtle bloom — this scene is calm
));
window.addEventListener('resize', () => composer.setSize(window.innerWidth, window.innerHeight));

// ── Lighting ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.08));
const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
topLight.position.set(0, 20, -10);
scene.add(topLight);

// ── Grid / Floor ──────────────────────────────────────────────────────────────
// TODO: Replace with ImprovedNoise-deformed PlaneGeometry (noise-grid approach)
//   1. Import ImprovedNoise from 'three/addons/math/ImprovedNoise.js'
//   2. PlaneGeometry with high segment count (128×128)
//   3. Displace Y-vertices with noise(x, z, time * 0.1) * amplitude
//   4. Compute normals after displacement
//   5. Keep as wireframe or use MeshStandardMaterial with low roughness

const gridGeo = new THREE.PlaneGeometry(80, 200, 40, 100);
const gridMat = new THREE.MeshBasicMaterial({
  color:     0x1a1a2e,
  wireframe: true,
});
const grid = new THREE.Mesh(gridGeo, gridMat);
grid.rotation.x = -Math.PI / 2;
grid.position.set(0, -6, -40);
scene.add(grid);

// ── Floating Sacred Primitives ────────────────────────────────────────────────
// TODO: All should be wireframe or flat matte, white/gray, no texture
//   Add slow ceremonial rotation. Arrangement should feel symmetrical / temple-like.

const primConfigs = [
  { geo: new THREE.SphereGeometry(1.5, 16, 16),      pos: [-8, 2, -15] },
  { geo: new THREE.BoxGeometry(2, 2, 2),              pos: [ 8, 2, -15] },
  { geo: new THREE.TorusGeometry(2, 0.4, 12, 36),    pos: [ 0, 5, -25] },
  { geo: new THREE.OctahedronGeometry(1.8),           pos: [-5, 1, -30] },
  { geo: new THREE.PlaneGeometry(4, 4),               pos: [ 5, 1, -30] },
  { geo: new THREE.IcosahedronGeometry(1.3, 0),       pos: [ 0, 0, -10] },
];

const wireframeMat = new THREE.MeshBasicMaterial({ color: 0x888899, wireframe: true });
const matteMat     = new THREE.MeshStandardMaterial({
  color:     0xccccdd,
  roughness: 0.9,
  metalness: 0.0,
});

const vaultPrims = primConfigs.map(({ geo, pos }, i) => {
  const useMatte = i % 2 === 0;
  const mesh = new THREE.Mesh(geo, useMatte ? matteMat.clone() : wireframeMat.clone());
  mesh.position.set(...pos);
  mesh.userData.rotSpeed = { x: 0.1 + Math.random() * 0.1, y: 0.15 + Math.random() * 0.1 };
  scene.add(mesh);
  return mesh;
});

// ── Scroll Narrative ──────────────────────────────────────────────────────────
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

// ── Render Loop ───────────────────────────────────────────────────────────────
startRenderLoop(clock, (delta, elapsed) => {
  vaultPrims.forEach((m) => {
    m.rotation.x += delta * m.userData.rotSpeed.x;
    m.rotation.y += delta * m.userData.rotSpeed.y;
  });

  // TODO: update noise grid Y-vertices here when ImprovedNoise is integrated
  composer.render(delta);
});
