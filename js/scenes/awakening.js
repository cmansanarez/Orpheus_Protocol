/**
 * awakening.js — PAGE 1: Awakening  (index.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual: Refracted signal chamber
 *
 *   • p5.js generates a living noise texture — flowing signal streams in the
 *     Archive palette (signal cyan + Eurydice magenta on void black). This
 *     texture is applied to the inside of a large BackSide sphere so the user
 *     feels enclosed within the degraded Archive.
 *
 *   • 8 floating crystal objects distributed along the descent path:
 *       - 4 × glass shell (MeshPhysicalMaterial, transmission 0.92) with a
 *         small glowing core (MeshBasicMaterial) that blooms through the glass.
 *       - 4 × MeshNormalMaterial — prismatic normals that shift as they rotate.
 *     All drift and rotate slowly; AfterimagePass leaves ghost trails.
 *
 *   • Two orbiting point lights (signal + fragment) give crystals dynamic shading.
 *
 *   • Post-processing: UnrealBloomPass + AfterimagePass. Bloom threshold is low
 *     so the crystal cores and p5 sparks both contribute glow.
 *
 *   • Camera breathes gently on X/Y; scroll drives Z (0 → -60).
 *
 * Spec reference: Bobby Roe — Refracting-Noise (architecture, not literal copy)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass }  from 'three/addons/postprocessing/AfterimagePass.js';

import { createThreeScene, startRenderLoop } from '../utils/SceneSetup.js';
import { ScrollNarrative }                   from '../utils/ScrollNarrative.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const CAM_Z_START  =   0;
const CAM_Z_END    = -60;   // total depth of descent at progress = 1
const CAM_BREATHE  = 0.3;   // X/Y float amplitude
const ENV_RADIUS   = 90;    // inward sphere radius
const TEX_SIZE     = 512;   // p5 canvas resolution
const TEX_INTERVAL = 6;     // Three.js frames between p5 redraws (~10fps at 60fps host)

// ── Three.js scene ────────────────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const { renderer, scene, camera, clock } = createThreeScene(canvas, {
  fov:  75,
  far:  500,
  background: new THREE.Color(0x000508),
});

// ── Post-processing ───────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.6,   // strength  — generous, this scene should feel saturated with light
  0.60,  // radius    — wider spread, softer glow
  0.08   // threshold — low so crystal cores and p5 sparks both bloom
);
composer.addPass(bloomPass);

// Damping 0.88 = each frame retains 88% of the last. At 60fps, a trail
// persists visibly for ~0.5s. Gives floating crystals ghostly depth.
const afterimagePass = new AfterimagePass(0.88);
composer.addPass(afterimagePass);

window.addEventListener('resize', () => {
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ── p5.js noise texture ───────────────────────────────────────────────────────
// p5.js is loaded as a regular <script> in index.html, making `p5` a global.
// Because <script type="module"> is deferred, p5 is guaranteed available here.
// The sketch uses noLoop() — we call envSketch.redraw() every TEX_INTERVAL frames.

let envSketch  = null;
let envTexture = null;

if (typeof p5 !== 'undefined') {
  // Hidden container — keeps the p5 canvas off-screen without destroying it
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed', top: '-9999px', left: '-9999px',
    width: '1px', height: '1px', overflow: 'hidden',
  });
  document.body.appendChild(container);

  let p5Canvas = null;    // raw HTMLCanvasElement — set inside setup()
  let noiseT   = 0;       // noise time accumulator

  envSketch = new p5((p) => {

    p.setup = () => {
      const cnv = p.createCanvas(TEX_SIZE, TEX_SIZE);
      p5Canvas = cnv.elt;                // grab the raw canvas before noLoop
      p.noLoop();                        // Three.js drives redraws explicitly
      p.background(0, 5, 20);           // void — deep navy seed
      p.noSmooth();
      p.noiseDetail(4, 0.5);
    };

    p.draw = () => {
      // ── Partial clear — old content fades gradually ──────────────────────
      // alpha 20/255 ≈ 8% replacement per frame at 10fps → ~1.2s persistence
      p.fill(0, 5, 20, 20);
      p.noStroke();
      p.rect(0, 0, TEX_SIZE, TEX_SIZE);

      // ── Layer A: slow deep-field blobs ───────────────────────────────────
      // Wide low-opacity violet shapes — give the texture a sense of depth
      p.noStroke();
      for (let i = 0; i < 5; i++) {
        const bx = p.noise(i * 0.5,       noiseT * 0.06) * TEX_SIZE;
        const by = p.noise(i * 0.5 + 100, noiseT * 0.06) * TEX_SIZE;
        const br = p.map(p.noise(i * 0.7 + 50, noiseT * 0.08), 0, 1, 40, 160);
        const bv = p.map(p.noise(i * 0.4 + 300, noiseT * 0.08), 0, 1, 2, 10);
        p.fill(40, 0, 100, bv);
        p.ellipse(bx, by, br, br);
      }

      // ── Layer B: signal stream lines ─────────────────────────────────────
      // Flowing noise-path lines. Cyan = Orpheus signal; magenta = Eurydice.
      p.noFill();
      for (let i = 0; i < 40; i++) {
        const s    = i * 47.3;
        const x1   = p.noise(s,       noiseT * 0.55) * TEX_SIZE;
        const y1   = p.noise(s + 73,  noiseT * 0.55) * TEX_SIZE;
        const x2   = p.noise(s + 20,  noiseT * 0.55 + 0.38) * TEX_SIZE;
        const y2   = p.noise(s + 93,  noiseT * 0.55 + 0.38) * TEX_SIZE;
        const bri  = p.noise(s * 0.02, noiseT * 0.3);
        const al   = p.map(bri, 0, 1, 4, 22);
        const w    = p.map(bri, 0, 1, 0.3, 1.8);
        p.strokeWeight(w);

        if (i % 6 === 0) {
          // Fragment hint — Eurydice magenta, rarer, fainter
          p.stroke(255, 0, 200, al * 0.75);
        } else {
          // Signal — Orpheus cyan
          p.stroke(0, 255, 225, al);
        }
        p.line(x1, y1, x2, y2);
      }

      // ── Layer C: prismatic spark points ──────────────────────────────────
      // Occasional bright glints — prismatic quality in the spec
      p.strokeWeight(1.5);
      for (let i = 0; i < 16; i++) {
        const sx  = p.noise(i * 11.1 + 400, noiseT * 2.0) * TEX_SIZE;
        const sy  = p.noise(i * 11.1 + 500, noiseT * 2.0) * TEX_SIZE;
        const val = p.noise(i * 0.5 + 600,  noiseT * 1.0);
        if (val > 0.62) {
          const a = p.map(val, 0.62, 1.0, 8, 40);
          if (i % 3 === 0)      p.stroke(255, 0,   200, a);  // magenta
          else if (i % 3 === 1) p.stroke(0,   255, 225, a);  // cyan
          else                  p.stroke(200, 150, 255, a);  // pale violet
          p.point(sx, sy);
        }
      }

      noiseT += 0.004;
    };

  }, container);

  // setup() has run synchronously — grab the canvas p5 created
  if (p5Canvas) {
    envTexture = new THREE.CanvasTexture(p5Canvas);
    envTexture.colorSpace = THREE.SRGBColorSpace;
  }
} else {
  console.warn('[Awakening] p5.js not found — env sphere falls back to solid colour.');
}

// ── Environment sphere ────────────────────────────────────────────────────────
// Large sphere, BackSide only — the user is inside it.
// With the p5 texture applied it becomes the "walls of the Archive".
const envGeo = new THREE.SphereGeometry(ENV_RADIUS, 64, 64);
const envMat = new THREE.MeshBasicMaterial({
  map:   envTexture ?? null,
  color: envTexture ? 0xffffff : 0x000814,
  side:  THREE.BackSide,
});
scene.add(new THREE.Mesh(envGeo, envMat));

// ── Lighting ──────────────────────────────────────────────────────────────────
// Very low ambient — scene lives through bloom, not fill light
scene.add(new THREE.AmbientLight(0x000a18, 1.0));

// Signal light (Orpheus cyan) — orbits slowly, casts teal highlights on crystals
const signalLight = new THREE.PointLight(0x00ffe1, 2.5, 70);
signalLight.position.set(6, 3, -15);
scene.add(signalLight);

// Fragment light (Eurydice magenta) — hints at her presence deeper in the scene
const fragmentLight = new THREE.PointLight(0xff00c8, 1.2, 50);
fragmentLight.position.set(-8, -2, -32);
scene.add(fragmentLight);

// ── Floating crystal objects ──────────────────────────────────────────────────
//
// 8 crystals placed along the Z descent path (Z: -10 to -55).
// Types alternate: glass (transmissive + core glow) vs prismatic (MeshNormal).
//
// Glass type: outer shell refracts the environment; inner core MeshBasicMaterial
// blooms through it. Transmission shows the env texture and other scene objects.
//
// Prismatic type: MeshNormalMaterial turns the geometry's surface normals into
// RGB colours — creates shifting, holographic colour as the object rotates.

const crystalDefs = [
  { geo: new THREE.IcosahedronGeometry(1.6, 0),  pos: [-5,  1, -12], type: 'glass',     core: 0x00ffe1 },
  { geo: new THREE.OctahedronGeometry(1.4, 0),   pos: [ 7,  2, -18], type: 'prismatic'                 },
  { geo: new THREE.SphereGeometry(1.2, 8, 8),    pos: [-6, -1, -24], type: 'glass',     core: 0xff00c8 },
  { geo: new THREE.TetrahedronGeometry(1.6, 0),  pos: [ 4, -2, -30], type: 'prismatic'                 },
  { geo: new THREE.IcosahedronGeometry(1.3, 1),  pos: [-9,  3, -36], type: 'glass',     core: 0x00ffe1 },
  { geo: new THREE.OctahedronGeometry(1.9, 0),   pos: [ 8,  0, -42], type: 'prismatic'                 },
  { geo: new THREE.SphereGeometry(1.5, 7, 7),    pos: [-4, -3, -48], type: 'glass',     core: 0xff00c8 },
  { geo: new THREE.TetrahedronGeometry(1.4, 0),  pos: [ 3,  4, -54], type: 'prismatic'                 },
];

const crystals = crystalDefs.map(({ geo, pos, type, core }) => {
  const group = new THREE.Group();
  group.position.set(...pos);

  if (type === 'glass') {
    // Outer shell — highly transmissive, almost invisible except for refraction
    const shell = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color:       new THREE.Color(0x001020),
      metalness:   0.0,
      roughness:   0.02,
      transmission: 0.92,
      thickness:   2.5,    // controls refraction depth
      ior:         1.45,   // close to glass
      transparent: true,
      opacity:     0.95,
    }));
    group.add(shell);

    // Inner core — MeshBasicMaterial so it always glows regardless of lighting.
    // Bloom picks it up through the transmissive shell → glowing crystal effect.
    const coreSize = geo.parameters?.radius
      ? geo.parameters.radius * 0.22
      : 0.30;
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(coreSize, 8, 8),
      new THREE.MeshBasicMaterial({ color: core })
    ));
  } else {
    // Prismatic — normals become colour, shifts as object rotates
    group.add(new THREE.Mesh(geo, new THREE.MeshNormalMaterial({
      transparent: true,
      opacity:     0.78,
    })));
  }

  group.userData = {
    rotX:  (0.08 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : -1),
    rotY:  0.10 + Math.random() * 0.15,
    floatSpeed:  0.15 + Math.random() * 0.25,
    floatOffset: Math.random() * Math.PI * 2,
    baseY: pos[1],
  };

  scene.add(group);
  return group;
});

// ── Scroll narrative ──────────────────────────────────────────────────────────
const scroll = new ScrollNarrative({
  sensitivity: 0.00022,   // slightly slower than default — Awakening is contemplative
  smoothing:   0.05,
  onProgress: (prog) => {
    camera.position.z = CAM_Z_START + (CAM_Z_END - CAM_Z_START) * prog;
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = (prog * 100) + '%';
    if (prog > 0.02) document.getElementById('scroll-hint')?.classList.add('hidden');
  },
});
scroll.loadBeatsFromDOM().start();

// ── Render loop ───────────────────────────────────────────────────────────────
let frame = 0;

startRenderLoop(clock, (delta, elapsed) => {
  frame++;

  // ── Camera breathe ────────────────────────────────────────────────────────
  // Independent of scroll; gives a slow floating sensation.
  camera.position.x = Math.sin(elapsed * 0.11) * CAM_BREATHE;
  camera.position.y = Math.cos(elapsed * 0.08) * CAM_BREATHE * 0.65;

  // ── Lights orbit ──────────────────────────────────────────────────────────
  signalLight.position.x   =  Math.sin(elapsed * 0.14) * 16;
  signalLight.position.z   =  Math.cos(elapsed * 0.14) * 16 - 18;
  fragmentLight.position.x =  Math.cos(elapsed * 0.10) * 12;
  fragmentLight.position.z =  Math.sin(elapsed * 0.10) * 12 - 35;

  // ── Crystal animation ─────────────────────────────────────────────────────
  crystals.forEach((g) => {
    const { rotX, rotY, floatSpeed, floatOffset, baseY } = g.userData;
    g.rotation.x += delta * rotX;
    g.rotation.y += delta * rotY;
    // Gentle buoyant float — each crystal on its own cadence
    g.position.y = baseY + Math.sin(elapsed * floatSpeed + floatOffset) * 0.55;
  });

  // ── Bloom pulse ───────────────────────────────────────────────────────────
  // Very slow sine — gives the scene a subtle "breathing" quality
  bloomPass.strength = 1.6 + Math.sin(elapsed * 0.22) * 0.18;

  // ── p5 texture update ─────────────────────────────────────────────────────
  // Drive p5 at ~10fps rather than 60fps. GPU texture upload only happens here.
  if (envSketch && envTexture && frame % TEX_INTERVAL === 0) {
    envSketch.redraw();
    envTexture.needsUpdate = true;
  }

  composer.render(delta);
});
