//Orpheus 3
//Cam Mansanarez | @noir_mak
//https://hydra.ojack.xyz/?sketch_id=S2tYrJmAwO3gDbyX

a.setBins(24)
a.setScale(2)
a.setCutoff(0.5)
a.setSmooth(0.8)
//a.show()

let makeLayer = (bin) => 
  osc(3,0,()=>a.fft[bin]*5)
    .rotate(44/14/2)
    .mult(
      shape(2, 0.25, 0)
        .rotate(44/14/2)
        .mult(shape(2, () => a.fft[bin]/22-0.01, 0.01).rotate(44/14/2),1),1)
	.modulate(osc(60,0).rotate((22/7)/3),()=>a.fft[bin]/5)
    .scrollX(bin/24,0.05)
	.rotate((22/7)/1.5)
	.scale(1.4)

let layerConfigs = [
    {bin:0},
    {bin:1},
    {bin:2},
    {bin:3},
    {bin:4},
    {bin:5},
    {bin:6},
    {bin:7},
    {bin:8},
    {bin:9},
    {bin:10},
    {bin:11},
    {bin:12},
    {bin:13},
    {bin:14},
    {bin:15},
    {bin:16},
    {bin:17},
    {bin:18},
    {bin:19},
    {bin:20},
    {bin:21},
    {bin:22},
    {bin:23}]

let layers = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].map(bin => makeLayer(bin))

let combined = layers.reduce((acc, layer, idx) => idx === 0 ? layer : acc.add(layer))

 .color(1, 0, 1, 1).luma(0)
combined.out(o0)
render(o0)

