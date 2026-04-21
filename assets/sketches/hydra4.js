//Orpheus 4
// Cam Mansanarez | @noir_mak
//https://hydra.ojack.xyz/?sketch_id=8b3hGvd9oRxNWe5k

// ── Conditional transforms (lib-cond.js — vendored inline) ─────────────────
// Defined here so they register before ifeven() is called in this sketch.
setFunction({
  name: 'ifpos', type: 'combine',
  inputs: [{ name: 'value', type: 'float', default: 1.0 }],
  glsl: `return value < 0.0 ? _c0 : _c1;`
})
setFunction({
  name: 'ifeven', type: 'combine',
  inputs: [{ name: 'value', type: 'float', default: 0.0 },
           { name: 'eps',   type: 'float', default: 0.01 }],
  glsl: `return abs(mod(floor(value), 2.0)) < eps ? _c0 : _c1;`
})
setFunction({
  name: 'ifzero', type: 'combine',
  inputs: [{ name: 'value', type: 'float', default: 0.0 },
           { name: 'eps',   type: 'float', default: 0.1 }],
  glsl: `return abs(value) < eps ? _c0 : _c1;`
})
setFunction({
  name: 'splitview', type: 'combine',
  inputs: [{ name: 'where', type: 'float', default: 0.5 }],
  glsl: `return gl_FragCoord.x / resolution.x > where ? _c0 : _c1;`
})
setFunction({
  name: 'splitviewh', type: 'combine',
  inputs: [{ name: 'where', type: 'float', default: 0.5 }],
  glsl: `return gl_FragCoord.y / resolution.y > where ? _c0 : _c1;`
})
// ─────────────────────────────────────────────────────────────────────────────

speed = 1
swap = () => (Math.floor(time / 2) % 2 === 0 ? 1 : 0)

// COLOR CYCLE
colorCycle = () => {
  let t = (time * 0.2) % 4
  if (t < 1) return [1, 0, 1]      // magenta
  else if (t < 2) return [1, 1, 0] // yellow
  else if (t < 3) return [0, 1, 1] // cyan
  else return [1, 1, 1]            // white
}

//SILK LINE
shape(2, [0, 2].fast(0.75).smooth(1), 0.5)
  .scale([0.2, 1].smooth(1)).scale(0.1, 0.3)
  .scrollY(0, 0.5)
  .modulateScale(osc(10,3,2).kaleid(2).scale(0.25), 25, 0) //run first
.out(o0)

// COMPOSITION LAYER
pattern = () => noise(20, 1).repeatY(1) //adjust noise amount
pattern()
  .scrollY(0.1, 0.1)
  .add(pattern(), 0.7)
  .modulateScale(osc(5, 0.5), 1, 0.2) 
  .modulate(noise(2, 0.5))
  .brightness(0.7) //turn on for more white
  .contrast(2)
.out(o1)

// IMAGE LAYER
imgMask = () => shape(4, 0.5, 0).repeatX([1, 2, 5, 10], () => Math.sin(time))
src(o1)
  .layer(src(o0).scale(1.35))
  .layer(src(s0).scrollX(0, 0.5).saturate(0).contrast(1.2).mask(imgMask()).mult(solid(1, 1, 1, () => swap())))

// --- GLITCH / conditional layer -> o3 ---
src(o1)
  .modulateScale(noise(1, 2).pixelate([100, 50, 10, 70].fast(2), 10), 5, 0)
  .ifeven(
    src(o1)
      .color(() => colorCycle()[0], () => colorCycle()[1], () => colorCycle()[2])
      .contrast(2)
      .kaleid([1, 4, 2].smooth(0.4).fast(0.1)),
    () => time * 2)

//LAYER
  .layer(src(o0).luma(0.1, 0.05)
  .modulate(noise([40, 0, 30, 0, 20, 0, 0].smooth(0.6).fast(0.8), 3), [1, 11].fast(2).smooth(0.4))
)
  
.out(o2)
render(o2)
