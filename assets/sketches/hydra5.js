//Orpheus 5
// Cam Mansanarez | @noir_mak
//https://hydra.ojack.xyz/?sketch_id=rKG0lsHeg4ylSAe7

// Audio
a.setBins(6)
a.setScale(8)
a.setCutoff(2)
a.setSmooth(0.9)

// --- Helpers ---
clamp01 = (x) => Math.max(0, Math.min(1, x))

// Energy from low bins (kick/bass-ish). Adjust index if needed.
E = () => clamp01(a.fft[0] * 1.6)

// Base fit pulse (slow, emotional)
fitBase = () => 0.5 + 0.5 * Math.sin(time * 0.18)

// Periodic hold fallback (rare, brief)
holdPeriodic = () => (Math.sin(time * 0.35) > 0.88 ? 1 : 0)

// Audio hold: when energy dips, we "lock" (or swap logic to lock on peaks)
holdAudio = () => (E() < 0.12 ? 1 : 0)

// Combine holds (either can freeze)
hold = () => (holdPeriodic() || holdAudio() ? 1 : 0)

// When holding, force fit high. Otherwise, fit increases a bit when audio is calmer.
fit = () => Math.max(fitBase() * (1 - 0.25 * E()), hold())
chaos = () => 1 - fit()

// Motion factor: 0 when holding, otherwise scaled by audio energy
motion = () => (1 - hold()) * (0.35 + 0.65 * E())

shape([3, 4, 5, 6], 0.1, 0.3)
  // scale grows and wobbles with energy, calms when fitting/holding
  .scale(() =>
    1.15 +
    0.9 * chaos() +
    0.25 * motion() * Math.sin(time * (0.6 + 2.0 * E()))
  )
.color(0.9, 0.9, 0.8)

  // texture layer: stronger when energetic, calmer when fitting
  .mult(
    osc(3, 1.1, 2)
      .contrast(() => 1.15 + 1.2 * chaos() + 0.8 * E())
  )

  // rotation distortion: audio-driven, shuts off on hold
  .modulateRotate(
    noise(1.2, 0.2),
    () => 10 * motion() * chaos()
  )
  .rotate(() => 0.14 * motion() * Math.sin(time * 0.4), 0.08)
  .scale([0.7, 1.5].fast(1.5).smooth(1))
  .out(o0)

render(o0)
