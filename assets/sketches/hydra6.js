//Orpheus 6
//C_Mansanarez | @noir_mak
//https://hydra.ojack.xyz/?sketch_id=i6NpyuZRMgAKVvja

//AUDIO SETTINGS
a.setSmooth(.9)
a.setCutoff(-1)
a.setScale(10)
a.setBins(6) 

//Constants
gate = () => Math.max(0, Math.sin(time * 1.2))
antiGate = () => 1 - gate()

// COLOR CYCLE
colorCycle = () => {
  let t = (time * 0.2) % 4
  if (t < 1) return [1, 1, 0, 1]      // yellow
  else if (t < 2) return [1, 0, 1, 1] // magenta
  else if (t < 3) return [0, 1, 1, 1] // cyan
  else return [1, 1, 1, 1]            // white
}

shape(3, 0.01, 0.5).rotate(Math.PI/2, 0.5)
  .contrast(1.2).saturate(0)
  
 .color(
  () => colorCycle()[0] * Math.max(0, a.fft[0] - 0.15) * 3,
  () => colorCycle()[1] * Math.max(0, a.fft[0] - 0.15) * 3,
  () => colorCycle()[2] * Math.max(0, a.fft[0] - 0.15) * 3
)


//Modulation Options
  .modulatePixelate(noise(3, 3).scrollY(0, 0.2),[100, 200].fast(0.2).smooth(0.4)) //noise overlay
  .modulate(noise(6, 0.2).pixelate(80, 40), 0.05).scale(1.1) // bitrate style "blockiness"
  .sub(src(o0).scale(1.01).rotate(0.005))      // subtle ghost feedback
  .modulate(src(o0), [0, 1].fast(0.5).smooth(0.4)) //modulate shift

//Gated Modulation
  .modulate(noise(6, 0.2).pixelate(80, 40),() => gate() * 0.05).scale(1.1)

//Shake
.scrollX(() =>gate() * (a.fft[1] + a.fft[2]) * 0.02 * Math.sin(time * 5))
.scrollY(() =>gate() * (a.fft[0] + a.fft[3]) * 0.02 * Math.cos(time * 4))
.rotate(() =>gate() * (a.fft[4] + a.fft[2]) * 0.02)

.out(o0)
