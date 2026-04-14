/**
 * portal.js — PAGE 5: The Portal  (portal.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual concept: Navigable black-box theatre cube.
 *   • Large cube: 6 interior faces + 6 exterior faces = 12 projection surfaces
 *   • Each face = independent Hydra canvas wrapped in THREE.CanvasTexture
 *   • Mouse-look camera (pointer lock), WASD movement
 *   • Interior: intimate, ritual, emotionally charged — Eurydice fragments
 *   • Exterior: public, projected, performative — outward signal
 *   • Mic input drives Hydra AFFT values via HydraManager.update()
 *   • Architecture scales: v1 with fewer live faces → final 12 active surfaces
 *
 * Hydra sketches will be supplied separately — call manager.initSketch(i, fn)
 * for each face once sketches are provided.
 *
 * Build status: SCAFFOLD ✦ Placeholder face textures. Hydra integration pending.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { MicInput }                          from '../utils/MicInput.js';
import { HydraManager }                      from '../utils/HydraManager.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const CUBE_SIZE      = 30;         // interior dimension in world units
const FACE_COUNT     = 12;         // 6 interior + 6 exterior
const MOVE_SPEED     = 0.08;
const LOOK_SENSITIVITY = 0.002;

// ── Scene ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, scene, camera, clock } = createThreeScene(canvas, {
  fov:  75,
  far:  500,
  background: new THREE.Color(0x000000),
});
camera.position.set(0, 0, 0);

// ── Microphone ────────────────────────────────────────────────────────────────
const mic = new MicInput({ fftSize: 1024, smoothing: 0.75 });

// ── Hydra Manager ─────────────────────────────────────────────────────────────
const manager = new HydraManager(mic);
await manager.init(FACE_COUNT);

// NOTE: Hydra sketches are NOT loaded here. Call manager.initSketch(i, fn) after
// the user provides the actual Hydra code for each face.

// ── Cube Faces ────────────────────────────────────────────────────────────────
// Face layout:
//   Interior faces  0–5   (BoxGeometry back-face, BackSide rendering)
//   Exterior faces  6–11  (BoxGeometry front-face, FrontSide rendering)
//
// Each face gets a CanvasTexture from the Hydra canvas.
// Placeholder: flat coloured planes until sketches are loaded.

const FACE_COLORS_INTERIOR = [0x110022, 0x001122, 0x002211, 0x221100, 0x220011, 0x112200];
const FACE_COLORS_EXTERIOR = [0x1a0033, 0x001a33, 0x00331a, 0x331a00, 0x33001a, 0x1a3300];

// Interior cube — large, inward-facing
const interiorCube = new THREE.Mesh(
  new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
  FACE_COLORS_INTERIOR.map((c, i) => new THREE.MeshBasicMaterial({
    color:    c,
    side:     THREE.BackSide,
    // map:   new THREE.CanvasTexture(manager.getCanvas(i))
    //        ↑ Uncomment when Hydra sketches are loaded onto faces 0–5
  }))
);
scene.add(interiorCube);

// Exterior cube — slightly larger, outward-facing
const exteriorCube = new THREE.Mesh(
  new THREE.BoxGeometry(CUBE_SIZE * 1.01, CUBE_SIZE * 1.01, CUBE_SIZE * 1.01),
  FACE_COLORS_EXTERIOR.map((c, i) => new THREE.MeshBasicMaterial({
    color:    c,
    side:     THREE.FrontSide,
    // map:   new THREE.CanvasTexture(manager.getCanvas(6 + i))
    //        ↑ Uncomment when Hydra sketches are loaded onto faces 6–11
  }))
);
scene.add(exteriorCube);

// ── Camera / Movement ─────────────────────────────────────────────────────────
// Pointer lock for mouse look
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup',   (e) => { keys[e.code] = false; });

canvas.addEventListener('click', () => canvas.requestPointerLock());

const euler = new THREE.Euler(0, 0, 0, 'YXZ');

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    document.addEventListener('mousemove', onMouseMove);
  } else {
    document.removeEventListener('mousemove', onMouseMove);
  }
});

function onMouseMove(e) {
  euler.setFromQuaternion(camera.quaternion);
  euler.y -= e.movementX * LOOK_SENSITIVITY;
  euler.x -= e.movementY * LOOK_SENSITIVITY;
  euler.x  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));
  camera.quaternion.setFromEuler(euler);
}

function handleMovement() {
  const dir = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp'])    dir.z -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  dir.z += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  dir.x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dir.x += 1;
  if (dir.lengthSq() > 0) {
    dir.normalize().multiplyScalar(MOVE_SPEED);
    dir.applyEuler(new THREE.Euler(0, euler.y, 0)); // yaw-only for WASD
    camera.position.addScaledVector(dir, 1);
    // Clamp inside / at the cube boundary + margin
    const half = CUBE_SIZE / 2 * 1.05;
    camera.position.clampScalar(-half, half);
  }
}

// ── Mic Init ──────────────────────────────────────────────────────────────────
const micBtn = document.getElementById('mic-btn');
if (micBtn) {
  micBtn.addEventListener('click', async () => {
    const ok = await mic.init();
    if (ok) micBtn.style.display = 'none';
  }, { once: true });
}

// ── Render Loop ───────────────────────────────────────────────────────────────
// TODO: When Hydra textures are active, mark each CanvasTexture.needsUpdate = true
//       on each frame so Three.js uploads the latest Hydra frame to the GPU.

startRenderLoop(clock, (delta, elapsed) => {
  handleMovement();

  // Update Hydra audio data
  manager.update();

  renderer.render(scene, camera);
});
