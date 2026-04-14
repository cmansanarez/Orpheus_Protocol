//Orpheus1
//Cam Mansanarez | @noir_mak
//https://hydra.ojack.xyz/?sketch_id=xXSlCrbliLgiMsyZ 

a.setSmooth(0.9)
a.setScale(4)
a.setBins(5)
a.setCutoff(2)


osc(5, 5, 0).luma(1).kaleid([0, 1])
	.colorama(() => a.fft[1])
	.colorama(0.8)
	.colorama(0.1)

.modulate(o0, [0, 1].fast(0.1).smooth(1))
.add(noise(1, 0.1).luma(0).scale(()=>a.fft[0] * Math.PI/2))
.add(solid(1, 0, 1, 1), 0.1)
.out(o0)
