/**
 * condition.js — PAGE 4: The Condition  (condition.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual concept: Threshold / transition scene.
 *   • Two visual states: Vault-like stability → Portal-like void
 *   • Blend driven by scroll progress via a mix-ratio uniform
 *   • Full-screen shader blend on a PlaneGeometry (transition-effect pattern)
 *   • Short directive text — high tension, minimal density
 *   • The scene dissolves as the user commits to moving forward
 *
 * Reference architecture: Bobby Roe — transition-effect
 * https://github.com/bobbyroe/transition-effect
 * (modular: FXScene.js + Transition.js + index.js — replicate this split)
 *
 * Build status: SCAFFOLD ✦ Solid colour lerp placeholder. Shader blend pending.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';

// ── Scene A: Vault state ──────────────────────────────────────────────────────
// TODO: Replace with a proper WebGLRenderTarget capturing a mini Vault scene
//   as scene texture A, and a Portal void as scene texture B.
//   Then blend A→B with a custom GLSL shader using mixRatio + threshold texture.
//   Mirror the modular split from transition-effect: FXScene.js / Transition.js

function makeRenderTarget() {
  return new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format:    THREE.RGBAFormat,
  });
}

const canvas = document.getElementById('bg-canvas');
const { renderer, scene: mainScene, camera: mainCam, clock } = createThreeScene(canvas, {
  background: new THREE.Color(0x000000),
});

// Scene A (Vault remnant)
const sceneA = new THREE.Scene();
sceneA.background = new THREE.Color(0x000814);
const boxA = new THREE.Mesh(
  new THREE.BoxGeometry(4, 4, 4),
  new THREE.MeshBasicMaterial({ color: 0x333355, wireframe: true })
);
sceneA.add(boxA);
const camA = mainCam.clone();
camA.position.set(0, 2, 8);
camA.lookAt(0, 0, 0);

// Scene B (Portal void)
const sceneB = new THREE.Scene();
sceneB.background = new THREE.Color(0x000000);
const ringB = new THREE.Mesh(
  new THREE.TorusGeometry(3, 0.15, 8, 48),
  new THREE.MeshBasicMaterial({ color: 0x00ffe1, wireframe: false })
);
sceneB.add(ringB);
const camB = mainCam.clone();
camB.position.set(0, 0, 8);
camB.lookAt(0, 0, 0);

const rtA = makeRenderTarget();
const rtB = makeRenderTarget();

// Transition blend shader
// TODO: Add a threshold/noise texture to create an organic wipe rather than linear
const blendMat = new THREE.ShaderMaterial({
  uniforms: {
    tA:       { value: rtA.texture },
    tB:       { value: rtB.texture },
    mixRatio: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tA;
    uniform sampler2D tB;
    uniform float mixRatio;
    varying vec2 vUv;
    void main() {
      vec4 colA = texture2D(tA, vUv);
      vec4 colB = texture2D(tB, vUv);
      gl_FragColor = mix(colA, colB, mixRatio);
    }
  `,
  depthTest:  false,
  depthWrite: false,
});

const blendQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blendMat);
mainScene.add(blendQuad);
mainCam.position.set(0, 0, 1);

// ── Scroll Narrative ──────────────────────────────────────────────────────────
const scroll = new ScrollNarrative({
  sensitivity: 0.00032,
  smoothing:   0.07,
  onProgress: (p) => {
    blendMat.uniforms.mixRatio.value = p;
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = (p * 100) + '%';
    if (p > 0.02) document.getElementById('scroll-hint')?.classList.add('hidden');
  },
});
scroll.loadBeatsFromDOM().start();

// ── Render Loop ───────────────────────────────────────────────────────────────
startRenderLoop(clock, (delta, elapsed) => {
  boxA.rotation.y  += delta * 0.3;
  ringB.rotation.z += delta * 0.5;

  // Render scene A → rtA
  renderer.setRenderTarget(rtA);
  renderer.render(sceneA, camA);

  // Render scene B → rtB
  renderer.setRenderTarget(rtB);
  renderer.render(sceneB, camB);

  // Blend to screen
  renderer.setRenderTarget(null);
  renderer.render(mainScene, mainCam);
});
