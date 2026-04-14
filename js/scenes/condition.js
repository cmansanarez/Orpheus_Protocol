/**
 * condition.js — PAGE 4: The Condition  (condition.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Threshold scene. Two rendered scenes dissolve together via a tile-hash shader.
 *
 *   Scene A — Vault echo: wireframe geometry drifting in a cold deep-navy void
 *   Scene B — Portal approach: cyan torus rings + swelling magenta signal core
 *
 *   Blend: ~2500 screen tiles, each flipping A→B at its own random threshold.
 *          smoothstep(±0.10) gives soft pixel edges at the dissolve front.
 *          Result: an organic dissolving veil, not a uniform fade.
 *
 *   Scroll progress (0→1) → mixRatio uniform
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';

// ── Render target factory ──────────────────────────────────────────────────────────────────────────────
function makeRT() {
  return new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format:    THREE.RGBAFormat,
  });
}

// ── Renderer + clock (from SceneSetup; scene/camera replaced below) ────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, clock } = createThreeScene(canvas, {
  background: new THREE.Color(0x000000),
});

// ── Blend pass: ortho camera + full-screen quad ──────────────────────────────────────────
// OrthographicCamera(-1,1,1,-1,0,1) with PlaneGeometry(2,2) at z=0 fills the
// viewport exactly and maps UV [0,1] to the full screen without perspective warp.
const blendScene = new THREE.Scene();
const blendCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const rtA = makeRT();
const rtB = makeRT();

// ── Tile-hash dissolve shader ─────────────────────────────────────────────────────────────────────────────
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

    // Per-tile pseudo-random threshold (50x50 grid ≈ 2500 tiles)
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2  tile      = floor(vUv * 50.0) / 50.0;
      float dissolveT = hash(tile);

      // Soft edge: transition zone spans ±0.10 around each tile's threshold
      float blend = smoothstep(dissolveT - 0.10, dissolveT + 0.10, mixRatio);

      vec4 colA = texture2D(tA, vUv);
      vec4 colB = texture2D(tB, vUv);
      gl_FragColor = mix(colA, colB, blend);
    }
  `,
  depthTest:  false,
  depthWrite: false,
});

blendScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blendMat));

// ── Scene A — Vault echo ────────────────────────────────────────────────────────────────────────────────
// Wireframe geometry echoing the vault, dissolving behind us.
const sceneA = new THREE.Scene();
sceneA.background = new THREE.Color(0x000814);
sceneA.fog = new THREE.FogExp2(0x000814, 0.06);

const camA = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camA.position.set(0, 2.5, 9);
camA.lookAt(0, 0, 0);

sceneA.add(new THREE.AmbientLight(0x060d1a, 1.0));
const lightA = new THREE.DirectionalLight(0x99aabb, 0.45);
lightA.position.set(4, 10, 8);
sceneA.add(lightA);

const wireMat = new THREE.MeshBasicMaterial({ color: 0x3a5060, wireframe: true });
const icoA    = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 1), wireMat.clone());
const cubeA1  = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5),  wireMat.clone());
const cubeA2  = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5),  wireMat.clone());
cubeA1.position.set(-5.5, 0.5, -2);
cubeA2.position.set( 5.5, 0.5, -2);
sceneA.add(icoA, cubeA1, cubeA2);

// ── Scene B — Portal approach ────────────────────────────────────────────────────────────────────────────
// Cyan ring gate opening in the void. Magenta core swells with scroll progress.
const sceneB = new THREE.Scene();
sceneB.background = new THREE.Color(0x000000);

const camB = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camB.position.set(0, 0, 10);
camB.lookAt(0, 0, 0);

const signalLight = new THREE.PointLight(0x00ffe1, 1.5, 50);
signalLight.position.set(0, 0, 4);
sceneB.add(signalLight);

const sigMat  = new THREE.MeshBasicMaterial({ color: 0x00ffe1, wireframe: true });
const torusB  = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.10, 12, 80), sigMat.clone());
const innerB  = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06,  8, 60), sigMat.clone());
// Third faint outer ring for depth
const outerB  = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.05,  8, 80),
  new THREE.MeshBasicMaterial({ color: 0x003322, wireframe: true }));
const coreB   = new THREE.Mesh(
  new THREE.SphereGeometry(0.30, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xff00c8 })   // magenta signal core
);
sceneB.add(torusB, innerB, outerB, coreB);

// ── Scroll ────────────────────────────────────────────────────────────────────────────────────────────
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

// ── Resize ────────────────────────────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  rtA.setSize(w, h);
  rtB.setSize(w, h);
  camA.aspect = w / h;  camA.updateProjectionMatrix();
  camB.aspect = w / h;  camB.updateProjectionMatrix();
});

// ── Render loop ───────────────────────────────────────────────────────────────────────────────────────
startRenderLoop(clock, (delta, elapsed) => {
  const t = blendMat.uniforms.mixRatio.value;

  // ── Scene A — vault relics slowly dissolving away ────────────────────────────────
  icoA.rotation.y   += delta * 0.12;
  icoA.rotation.x   += delta * 0.05;
  cubeA1.rotation.y += delta * 0.08;
  cubeA2.rotation.y -= delta * 0.08;
  // Fade A's ambient as transition advances — the vault dims as we leave it
  sceneA.background  = new THREE.Color(0x000814).lerp(new THREE.Color(0x000000), t * 0.6);

  // ── Scene B — portal assembling ──────────────────────────────────────────────────
  torusB.rotation.z  += delta * 0.18;
  innerB.rotation.z  -= delta * 0.28;
  outerB.rotation.z  += delta * 0.06;

  // Core swells as the portal opens; heartbeat pulse on top
  const pulse = Math.sin(elapsed * 2.4) * 0.12;
  coreB.scale.setScalar(1.0 + t * 2.2 + pulse);

  // Signal light intensifies with scroll progress
  signalLight.intensity = 0.6 + t * 2.8 + Math.sin(elapsed * 1.8) * 0.4;

  // ── Render A → rtA, B → rtB, then blend to screen ───────────────────────────────
  renderer.setRenderTarget(rtA);
  renderer.render(sceneA, camA);

  renderer.setRenderTarget(rtB);
  renderer.render(sceneB, camB);

  renderer.setRenderTarget(null);
  renderer.render(blendScene, blendCam);
});
