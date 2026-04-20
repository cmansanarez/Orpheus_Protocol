/**
 * MicInput.js
 * Web Audio API microphone wrapper.
 *
 * Usage:
 *   const mic = new MicInput();
 *   const ok  = await mic.init();    // prompts browser permission
 *   if (!ok) { /* handle fallback *\/ }
 *
 *   // Inside animation loop:
 *   const level = mic.getLevel();    // 0–1 RMS amplitude
 *   const fft   = mic.getFFT();      // Uint8Array — frequency bins 0–255
 *
 * Note on Hydra integration:
 *   getFFT() returns the same Uint8Array reference each frame.
 *   When passing values to Hydra a.setBins(), extract the specific
 *   frequency ranges your sketch needs rather than storing the array.
 */

export class MicInput {
  /**
   * @param {object} options
   * @param {number} [options.fftSize=1024]     power-of-two (256–32768)
   * @param {number} [options.smoothing=0.8]    AnalyserNode smoothingTimeConstant
   */
  constructor(options = {}) {
    this.fftSize   = options.fftSize   ?? 1024;
    this.smoothing = options.smoothing ?? 0.8;

    this._ctx       = null;
    this._analyser  = null;
    this._source    = null;
    this._fftBuf    = null;
    this._timeBuf   = null;
    this.ready      = false;
  }

  /**
   * Request microphone access and initialize the audio pipeline.
   * @returns {Promise<boolean>} true if successful
   */
  async init() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._analyser = this._ctx.createAnalyser();
      this._analyser.fftSize = this.fftSize;
      this._analyser.smoothingTimeConstant = this.smoothing;

      this._source = this._ctx.createMediaStreamSource(stream);
      this._source.connect(this._analyser);

      this._fftBuf  = new Uint8Array(this._analyser.frequencyBinCount);
      this._timeBuf = new Uint8Array(this._analyser.fftSize);

      this.ready = true;
      localStorage.setItem('orpheus-mic', '1');
      console.log('[MicInput] Ready. Bin count:', this.binCount);
      return true;
    } catch (err) {
      console.warn('[MicInput] Access unavailable:', err.message);
      // Allocate silent buffers so callers never receive undefined
      this._fftBuf  = new Uint8Array(this.fftSize / 2);
      this._timeBuf = new Uint8Array(this.fftSize);
      this.ready = false;
      return false;
    }
  }

  /**
   * RMS amplitude of the current time-domain signal, normalised 0–1.
   * Call once per animation frame.
   */
  getLevel() {
    if (!this.ready) return 0;
    this._analyser.getByteTimeDomainData(this._timeBuf);
    let sum = 0;
    for (let i = 0; i < this._timeBuf.length; i++) {
      const v = (this._timeBuf[i] / 128.0) - 1.0;
      sum += v * v;
    }
    return Math.sqrt(sum / this._timeBuf.length);
  }

  /**
   * Frequency-domain data as Uint8Array (0–255 per bin).
   * The returned array is reused each frame — copy if you need to retain values.
   */
  getFFT() {
    if (!this.ready) return this._fftBuf;
    this._analyser.getByteFrequencyData(this._fftBuf);
    return this._fftBuf;
  }

  /** Convenience: normalised amplitude for a specific FFT bin (0–1). */
  getBinLevel(binIndex) {
    this.getFFT();
    return (this._fftBuf[binIndex] ?? 0) / 255;
  }

  get binCount() { return this._analyser?.frequencyBinCount ?? this.fftSize / 2; }

  /**
   * If microphone permission was granted in a previous scene/page-load,
   * silently re-init without showing any browser permission dialog.
   * @returns {Promise<boolean>}
   */
  async autoInit() {
    if (localStorage.getItem('orpheus-mic') !== '1') return false;
    return this.init();
  }

  dispose() {
    if (!this._ctx) return;
    this._source?.disconnect();
    this._ctx.close();
    this._ctx  = null;
    this.ready = false;
  }
}
