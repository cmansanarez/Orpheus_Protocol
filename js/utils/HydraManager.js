/**
 * HydraManager.js
 * Manages Hydra instances for the Portal scene (portal.html only).
 *
 * Architecture:
 *   - Creates N off-screen <canvas> elements (one per cube face)
 *   - Attaches an independent Hydra instance to each when a sketch is provided
 *   - Exposes each canvas so the Three.js scene can wrap it in CanvasTexture
 *   - Routes mic/FFT data to each Hydra instance via update()
 *
 * Hydra expects the global `Hydra` constructor from the standalone bundle
 * loaded in portal.html via <script src="https://unpkg.com/hydra-synth">.
 *
 * Usage:
 *   const manager = new HydraManager(micInput);
 *   await manager.init(12);
 *
 *   // Later, when Hydra sketches are provided by user:
 *   manager.initSketch(0, () => {
 *     osc(10, 0.1, 1.5).out();
 *   });
 *
 *   // In Three.js material setup:
 *   const tex = new THREE.CanvasTexture(manager.getCanvas(0));
 *
 *   // In render loop:
 *   manager.update();
 */

export class HydraManager {
  /**
   * @param {import('./MicInput.js').MicInput} micInput
   */
  constructor(micInput) {
    this.mic       = micInput;
    this.canvases  = [];    // HTMLCanvasElement per face
    this.instances = [];    // Hydra instance per face (sparse — only set after initSketch)
    this._container = null;
    this._faceCount = 0;
  }

  /**
   * Create off-screen canvases and a hidden container div.
   * Does NOT initialise Hydra — call initSketch() for each face later.
   * @param {number} [faceCount=12]
   */
  async init(faceCount = 12) {
    this._faceCount = faceCount;

    this._container = document.createElement('div');
    this._container.id = 'hydra-offscreen';
    Object.assign(this._container.style, {
      position: 'fixed',
      top: '-9999px', left: '-9999px',
      pointerEvents: 'none',
      visibility: 'hidden',
    });
    document.body.appendChild(this._container);

    for (let i = 0; i < faceCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width  = 512;
      canvas.height = 512;
      canvas.id = `hydra-face-${i}`;
      this._container.appendChild(canvas);
      this.canvases.push(canvas);
      this.instances.push(null);
    }

    console.log(`[HydraManager] ${faceCount} canvases ready. Call initSketch(i, fn) per face.`);
  }

  /**
   * Attach a Hydra sketch to a specific face canvas.
   * The sketchFn is called with no arguments; Hydra methods are available
   * globally after Hydra instantiation (standard Hydra pattern).
   *
   * @param {number}   faceIndex  0 – (faceCount-1)
   * @param {function} sketchFn   () => { osc(10).out(); }
   */
  initSketch(faceIndex, sketchFn) {
    if (faceIndex >= this._faceCount) {
      console.warn(`[HydraManager] faceIndex ${faceIndex} out of range.`); return;
    }
    if (typeof Hydra === 'undefined') {
      console.error('[HydraManager] Hydra global not found. Is hydra-synth loaded?'); return;
    }

    const canvas = this.canvases[faceIndex];
    const h = new Hydra({ canvas, autoLoop: true, detectAudio: false });
    this.instances[faceIndex] = h;

    try {
      sketchFn();
    } catch (err) {
      console.error(`[HydraManager] Sketch error on face ${faceIndex}:`, err);
    }
  }

  /**
   * Get the raw <canvas> for a face (wrap in THREE.CanvasTexture in the scene).
   * @param {number} faceIndex
   * @returns {HTMLCanvasElement}
   */
  getCanvas(faceIndex) { return this.canvases[faceIndex]; }

  /**
   * Update audio-reactive values each frame.
   * Stores mic level on window.micLevel and FFT on window.micFFT so
   * Hydra sketches can reference them via a.setScale() / a.fft[].
   * The actual per-face modulation is defined inside each Hydra sketch.
   */
  update() {
    if (!this.mic?.ready) return;
    const level = this.mic.getLevel();
    const fft   = this.mic.getFFT();

    // Expose globals for Hydra sketch access
    window.micLevel = level;
    window.micFFT   = fft;

    // TODO: When sketches are provided, map specific AFFT bins per face here.
    // Example pattern:
    //   if (this.instances[0]) {
    //     // face 0 reacts to low-freq energy
    //     a.setScale(fft[8] / 255);
    //   }
  }

  dispose() {
    this._container?.remove();
    this._container = null;
    this.instances = [];
    this.canvases  = [];
  }
}
