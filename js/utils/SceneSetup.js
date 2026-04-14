/**
 * SceneSetup.js
 * Shared Three.js bootstrapping utility.
 *
 * Exports:
 *   createThreeScene(canvas, options) → { renderer, scene, camera, clock, dispose }
 *   startRenderLoop(clock, frameFn)  → stopFn
 *
 * Each scene page calls createThreeScene once, then drives its own
 * frameFn that controls rendering (with or without EffectComposer).
 */

import * as THREE from 'three';

/**
 * Bootstrap a full Three.js context on a given <canvas> element.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} options
 * @param {number}  [options.fov=60]
 * @param {number}  [options.near=0.1]
 * @param {number}  [options.far=2000]
 * @param {boolean} [options.alpha=false]
 * @param {boolean} [options.antialias=true]
 * @param {THREE.ToneMapping} [options.toneMapping]
 * @param {number}  [options.toneMappingExposure=1.0]
 * @param {THREE.Color|null} [options.background]
 * @returns {{ renderer, scene, camera, clock, dispose }}
 */
export function createThreeScene(canvas, options = {}) {
  const {
    fov                  = 60,
    near                 = 0.1,
    far                  = 2000,
    alpha                = false,
    antialias            = true,
    toneMapping          = THREE.ACESFilmicToneMapping,
    toneMappingExposure  = 1.0,
    background           = new THREE.Color(0x000000),
  } = options;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping        = toneMapping;
  renderer.toneMappingExposure = toneMappingExposure;

  // Scene
  const scene = new THREE.Scene();
  if (!alpha && background !== null) scene.background = background;

  // Camera
  const camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    near,
    far
  );

  // Clock
  const clock = new THREE.Clock();

  // Responsive resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  function dispose() {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
  }

  return { renderer, scene, camera, clock, dispose };
}

/**
 * Start an animation loop.
 * The caller supplies a complete frameFn that handles both update AND render.
 * This lets scenes use plain renderer.render() OR an EffectComposer freely.
 *
 * @param {THREE.Clock} clock
 * @param {(delta: number, elapsed: number) => void} frameFn
 * @returns {() => void}  call to cancel the loop
 */
export function startRenderLoop(clock, frameFn) {
  let rafId;
  function tick() {
    rafId = requestAnimationFrame(tick);
    const delta   = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    frameFn(delta, elapsed);
  }
  tick();
  return () => cancelAnimationFrame(rafId);
}
