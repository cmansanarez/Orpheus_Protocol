/**
 * ScrollNarrative.js
 * Maps wheel / touch input to a 0–1 progress value.
 * Drives HTML beat elements (story lines) through a depth-illusion lifecycle:
 *   waiting → approaching → present → receding → done
 *
 * Usage:
 *   const scroll = new ScrollNarrative({ onProgress: (p) => { camera.position.z = p * -50; } });
 *   scroll.loadBeatsFromDOM().start();
 *
 * Beat elements use data attributes:
 *   data-beat="0.25"          required — progress value at peak visibility
 *   data-approach="0.12"      optional — window to approach (default 0.12)
 *   data-recede="0.08"        optional — window to recede  (default 0.08)
 */

export class ScrollNarrative {
  /**
   * @param {object} options
   * @param {number} [options.sensitivity=0.00028]  wheel delta multiplier
   * @param {number} [options.smoothing=0.06]       lerp factor per frame
   * @param {(progress: number) => void} [options.onProgress]
   */
  constructor(options = {}) {
    this.progress       = 0;
    this.targetProgress = 0;
    this.sensitivity    = options.sensitivity ?? 0.00028;
    this.smoothing      = options.smoothing   ?? 0.06;
    this.onProgress     = options.onProgress  ?? null;
    // Y-axis stagger: how many px a beat drifts up/down relative to center.
    // Separates overlapping beats without breaking the depth metaphor.
    // Approaching beats rise from below; receding beats drift above.
    this.yFactor        = options.yFactor     ?? 600;
    this.beats          = [];
    this._running       = false;
    this._raf           = null;
    this._lastTouchY    = null;

    this._onWheel    = this._onWheel.bind(this);
    this._onTouch    = this._onTouch.bind(this);
    this._onKey      = this._onKey.bind(this);
    this._onKeyUp    = this._onKeyUp.bind(this);
    this._gateTimers = {};
  }

  // ── Public API ────────────────────────────────────────────

  /**
   * Register a single beat manually.
   * @param {number} progressValue  0–1
   * @param {HTMLElement} el
   * @param {{ approachWindow?: number, recedeWindow?: number }} opts
   */
  addBeat(progressValue, el, opts = {}) {
    this.beats.push({
      progress:       progressValue,
      el,
      approachWindow: opts.approachWindow ?? 0.12,
      recedeWindow:   opts.recedeWindow   ?? 0.08,
    });
    return this;
  }

  /**
   * Auto-discover beats from DOM elements that carry data-beat="…".
   * Safe to call multiple times (won't double-add).
   * @param {ParentNode} [root=document]
   */
  loadBeatsFromDOM(root = document) {
    const seen = new Set(this.beats.map(b => b.el));
    root.querySelectorAll('[data-beat]').forEach(el => {
      if (seen.has(el)) return;
      const p  = parseFloat(el.dataset.beat);
      if (isNaN(p)) return;
      this.addBeat(p, el, {
        approachWindow: parseFloat(el.dataset.approach ?? '0.12'),
        recedeWindow:   parseFloat(el.dataset.recede   ?? '0.08'),
      });
    });
    return this;
  }

  start() {
    if (this._running) return this;
    this._running = true;
    window.addEventListener('wheel',      this._onWheel, { passive: false });
    window.addEventListener('touchstart', this._onTouch, { passive: true });
    window.addEventListener('touchmove',  this._onTouch, { passive: false });
    window.addEventListener('keydown',    this._onKey);
    window.addEventListener('keyup',      this._onKeyUp);
    this._loop();
    return this;
  }

  stop() {
    this._running = false;
    window.removeEventListener('wheel',      this._onWheel);
    window.removeEventListener('touchstart', this._onTouch);
    window.removeEventListener('touchmove',  this._onTouch);
    window.removeEventListener('keydown',    this._onKey);
    window.removeEventListener('keyup',      this._onKeyUp);
    cancelAnimationFrame(this._raf);
  }

  /** Jump directly to a progress value (no animation). */
  setProgress(v) {
    this.progress = this.targetProgress = Math.max(0, Math.min(1, v));
  }

  getProgress() { return this.progress; }

  // ── Private ───────────────────────────────────────────────

  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY * this.sensitivity;
    this.targetProgress = Math.max(0, Math.min(1, this.targetProgress + delta));
  }

  _onTouch(e) {
    if (e.type === 'touchstart') { this._lastTouchY = e.touches[0].clientY; return; }
    if (this._lastTouchY === null) return;
    e.preventDefault();
    const dy = (this._lastTouchY - e.touches[0].clientY) * this.sensitivity * 2.5;
    this._lastTouchY = e.touches[0].clientY;
    this.targetProgress = Math.max(0, Math.min(1, this.targetProgress + dy));
  }

  _loop() {
    if (!this._running) return;

    // Smooth lerp toward target
    this.progress += (this.targetProgress - this.progress) * this.smoothing;

    // Update every registered beat
    for (const beat of this.beats) this._updateBeat(beat);

    // Notify scene
    if (this.onProgress) this.onProgress(this.progress);

    this._raf = requestAnimationFrame(() => this._loop());
  }

  /**
   * Drive an individual beat element's CSS based on its distance from current progress.
   *
   * Lifecycle windows (progress units):
   *   [...approaching window...] [peak] [...receding window...]
   *
   * Scale: 0.4 → 1.0 on approach, 1.0 → 0.4 on recede.
   * Opacity: same curve as scale.
   * Y-shift: beats approach from below (positive Y), recede upward (negative Y).
   *   This staggers beats that are simultaneously visible, preventing stack overlap.
   * Brightness: peaks at center so the current beat is visually dominant.
   */
  _updateBeat(beat) {
    const { el, progress: bp, approachWindow: aw, recedeWindow: rw } = beat;
    if (!el) return;

    const delta = this.progress - bp;  // negative = ahead (approaching), positive = behind (receding)

    let scale, opacity;

    if (delta < -aw) {
      // Waiting far ahead — invisible, small
      scale = 0.4; opacity = 0;
    } else if (delta < 0) {
      // Approaching
      const t = (delta + aw) / aw;     // 0 → 1
      scale   = 0.4 + t * 0.6;
      opacity = t;
    } else if (delta < rw) {
      // Receding
      const t = 1 - (delta / rw);      // 1 → 0
      scale   = 0.4 + t * 0.6;
      opacity = t;
    } else {
      // Passed — invisible, small
      scale = 0.4; opacity = 0;
    }

    // Y stagger: negative delta → beat is ahead → push below center (+Y).
    // As it reaches peak (delta=0) it centres. Past peak it drifts upward (-Y).
    const yShift = (-delta * this.yFactor).toFixed(1);

    // Brightness peaks at 1.0 when scale=1.0 (current beat), dims when peripheral.
    // Keeps the "active" line crisp while surrounding beats step back.
    const brightness = (0.4 + scale * 0.6).toFixed(3);

    el.style.opacity   = opacity.toFixed(4);
    el.style.transform = `translate(-50%, calc(-50% + ${yShift}px)) scale(${scale.toFixed(4)})`;
    el.style.filter    = `brightness(${brightness})`;
  }

  _onKey(e) {
    const code       = e.code;
    const isAdvance  = (code === 'ArrowUp'   || code === 'ArrowRight');
    const isRetreat  = (code === 'ArrowDown' || code === 'ArrowLeft');
    if (!isAdvance && !isRetreat) return;
    e.preventDefault();

    if (this._atGate()) {
      const choices = document.querySelectorAll('.beat--choice .choice-btn');
      if (choices.length === 2) {
        // Branch page: up/left → first choice (Fracture), right → second (Resonance)
        if (code === 'ArrowLeft' || code === 'ArrowUp')  { this._startGateHold(code, choices[0]); return; }
        if (code === 'ArrowRight')                        { this._startGateHold(code, choices[1]); return; }
        // ArrowDown at branch: falls through to retreat
      } else if (choices.length >= 1 && isAdvance) {
        this._startGateHold(code, choices[0]);
        return;
      }
    }

    if (isAdvance) {
      this._jumpToNextBeat();
      this._flashKey('next');
    } else {
      this._jumpToPrevBeat();
      this._flashKey('prev');
    }
  }

  // Jump targetProgress to the next beat's peak value
  _jumpToNextBeat() {
    const sorted = [...new Set(this.beats.map(b => b.progress))].sort((a, b) => a - b);
    const next   = sorted.find(p => p > this.targetProgress + 0.005);
    this.targetProgress = (next !== undefined) ? next : 1.0;
  }

  // Jump targetProgress to the previous beat's peak value
  _jumpToPrevBeat() {
    const sorted = [...new Set(this.beats.map(b => b.progress))].sort((a, b) => b - a);
    const prev   = sorted.find(p => p < this.targetProgress - 0.005);
    this.targetProgress = (prev !== undefined) ? prev : 0.0;
  }

  // Briefly highlight the ↑ or ↓ key in the #key-hint element
  _flashKey(dir) {
    const container = document.getElementById('key-hint');
    if (!container) return;
    const keys = container.querySelectorAll('.key');
    const idx  = (dir === 'next') ? 0 : 1;  // [0]=up (advance)  [1]=down (retreat)
    const el   = keys[idx];
    if (!el) return;
    el.classList.add('key--active');
    setTimeout(() => el.classList.remove('key--active'), 180);
  }

  // Returns true when targetProgress is within 0.06 of the last beat (the gate)
  _atGate() {
    const choices = document.querySelectorAll('.beat--choice .choice-btn');
    if (!choices.length) return false;
    const lastBeat = Math.max(...this.beats.map(b => b.progress));
    return this.targetProgress >= lastBeat - 0.06;
  }

  // Begin the hold-to-navigate countdown for a specific choice button
  _startGateHold(code, btn) {
    if (this._gateTimers[code]) return;   // already holding this key
    btn.classList.add('filling');
    this._gateTimers[code] = setTimeout(() => {
      delete this._gateTimers[code];
      window.location.href = btn.href;
    }, 1500);
  }

  // Cancel any in-progress gate hold when key is released
  _onKeyUp(e) {
    const code = e.code;
    if (this._gateTimers[code]) {
      clearTimeout(this._gateTimers[code]);
      delete this._gateTimers[code];
      document.querySelectorAll('.choice-btn.filling')
        .forEach(el => el.classList.remove('filling'));
    }
  }

}