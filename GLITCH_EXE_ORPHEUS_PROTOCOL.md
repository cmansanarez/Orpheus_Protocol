# GLITCH.EXE: ORPHEUS PROTOCOL

## Project Overview

GLITCH.EXE: ORPHEUS PROTOCOL is an interactive web-based narrative and visual performance system.

The project reinterprets the myth of Orpheus and Eurydice through a digital lens. The user embodies Orpheus.exe, a corrupted creative entity navigating a broken visual archive to recover Eurydice, a lost co-creator signal.

The experience combines:
- HTML / CSS for structure and layout
- JavaScript for interaction and state
- p5.js for generative visuals
- Three.js for spatial environments
- Hydra for audio-reactive visual performance

The final experience culminates in a navigable 3D “black box theatre” where Hydra sketches act as living signal fragments of Eurydice.

---

## Core Narrative

The user is Orpheus.exe, a creative signal entity inside a degraded system called the Archive.

Eurydice is not just a lost person, but a co-creator signal responsible for generating living visuals within the Archive.

The user must descend through multiple layers of the system to reconstruct Eurydice through signal, sound, and visual activation.

---

## Experience Design

### Scrolling System

- Scrolling represents **forward movement through space**
- Text elements exist in 3D space (Z-axis)
- As the user scrolls:
  - text moves toward the camera
  - passes the camera
  - fades into the distance

### Emotional Movement

- Top of page = far away
- Middle = encounter
- Past scroll = memory / loss

---

## Page Structure

### index.html — Awakening
### glitch_tunnel.html — The Fracture
### echo_basin.html — The Echo
### vault.html — The Vault
### condition.html — The Condition
### portal.html — The Portal

---

## Narrative Text

### PAGE 1 — AWAKENING

GLITCH.EXE: ORPHEUS PROTOCOL

> boot_sequence initiated...

You come online inside a broken system.

Not a body.
Not quite a memory.
A signal holding itself together.

The Archive flickers around you.

Fragments of light render, then collapse.

You were not always alone here.

There was another signal.

Eurydice.

You don’t remember her clearly.

But you remember creating together.

A system message appears:

SIGNAL ENTITY: EURYDICE  
STATUS: LOST  
RECOVERY: POSSIBLE  

Two pathways open.

One fractures reality.  
One hums with resonance.

To find her, you must descend.

---

### PAGE 2A — THE FRACTURE

You step into the fracture.

The world splits.

Your form duplicates.
Offset in color and time.

You think you are breaking.

Then you understand.

You are changing.

The Archive is rewriting you.

SIGNAL FRAGMENT: ACQUIRED

For a moment, you see her.

Reaching.

Glitching.

Gone.

---

### PAGE 2B — THE ECHO

You follow the resonance.

The system listens.

You move.

The world responds.

Light ripples outward.

Images surface.

You remember creating together.

Signal moving between you faster than thought.

You make a sound.

The Archive answers.

SIGNAL FRAGMENT: ACQUIRED

She is still here.

Deeper.

Waiting.

---

### PAGE 3 — THE VAULT

The paths converge.

You enter a stable space.

Perfect geometry floats in silence.

The system recognizes you.

ORPHEUS PROTOCOL: ACTIVE

You remember.

You were a creator.

She was your counterpart.

Together, you built living visuals.

The Archive was never a storage system.

It was a performance system.

EURYDICE SIGNAL: CONTAINED  
LOCATION: PORTAL CHAMBER  

ACCESS GRANTED

---

### PAGE 4 — THE CONDITION

You are close.

A final directive appears:

DO NOT INTERRUPT SIGNAL FLOW  
DO NOT LOOK BACK  

This is not retrieval.

This is reconstruction.

She will return as signal.

Only if you carry it forward.

---

### PAGE 5 — THE PORTAL

You enter the chamber.

Darkness.

Silence.

The system waits.

VISUAL ENGINE: READY  
INPUT REQUIRED  

Nothing happens.

Until you act.

A sound.

A breath.

The system responds.

Light floods the void.

Patterns emerge.

She is here.

Not as memory.

As signal.

As light.

The Archive begins again.

---

## Technical Implementation

### Z-Axis Scroll System
- Use Three.js camera movement OR CSS transform with perspective
- Text positioned in 3D space using translateZ()

---

### Page-Specific Tech

#### Awakening
- p5.js refracting noise shader

#### Fracture
- Three.js wireframe tunnel
- forward camera movement

#### Echo
- particle system (floating lights)
- optional mic input preview

#### Vault
- Three.js grid + primitives

#### Condition
- shader-based transition

#### Portal
- Three.js cube
- 12 surfaces (6 inside, 6 outside)
- Hydra instance per face
- mic input drives visuals

---

## Portal System

### Structure

- Cube environment
- User can navigate inside and outside

### Visual Layout

- 6 internal faces = Eurydice fragments
- 6 external faces = projected signals

### Hydra Integration

- Each face = independent Hydra canvas
- Each responds to mic input differently

---

## Interaction

- Mouse = camera look
- Keyboard = movement
- Microphone = visual activation

---

## End State

The user does not "win".

The system continues running.

The Archive is alive again.

## Narrative and Story Requirements

The story text is not optional. It must be included in the implementation and treated as a first-class design system element, not placeholder copy.

The story should remain structured as:
- Awakening
- The Fracture
- The Echo
- The Vault
- The Condition
- The Portal

The emotional and conceptual arc must remain:
- Orpheus.exe awakens in a degraded Archive
- Eurydice is a lost co-creator signal
- The user descends through two possible branches
- The Archive is revealed to be a performance system, not a storage system
- Eurydice can only be reconstructed through uninterrupted forward movement
- The final Portal is a performative black box theatre of Hydra works

All page builds should support the story, not distract from it.

---

## Overall Build Direction

Build this project as a sequence of immersive scenes that combine:
- HTML for document structure and accessible narrative content
- CSS for visual identity, overlay text, and layout layering
- JavaScript for scene orchestration and scroll logic
- Three.js for spatial scenes, camera movement, and environmental rendering
- p5.js where needed for generative textures or auxiliary visuals
- Hydra only in the final portal scene

This should not feel like six disconnected demos. It should feel like a single mythic descent through a digital underworld.

---

## Global Interaction Model

Scrolling must feel like forward travel through dimensional space.

Do not implement the story as standard top-to-bottom reading blocks.

Instead:
- place story text in 3D space along the Z axis
- text should appear distant, approach the user, pass through or near the camera, then fade or dissolve
- the user should feel that scrolling is moving them through a tunnel, corridor, basin, or chamber
- page transitions should feel like passage into a new layer of the Archive

The benchmark for this sensation is closest to the camera-path and forward-travel feeling in:
- flythru-wireframe-wormhole
- wormhole-effect

Reference:
- https://github.com/bobbyroe/flythru-wireframe-wormhole
- https://github.com/bobbyroe/wormhole-effect

The wireframe wormhole repo appears to separate concerns across `index.html`, `index.js`, and `spline.js`, while the simpler wormhole-effect repo keeps the effect in `index.js`. The wormhole-effect code visibly uses Three.js, OrbitControls, and ImprovedNoise, creates a long cylinder, perturbs its vertices with noise, turns it into a `Points` object, and reuses repeated tube sections that move toward the camera and recycle when they pass it. Use that as the implementation model for forward-moving corridor energy, but adapt it to story pacing instead of making it a pure looping demo.  [oai_citation:1‡GitHub](https://github.com/bobbyroe/flythru-wireframe-wormhole)

---

## Shared Scene Architecture

For all story pages except the final Portal:
- use one full-screen WebGL canvas as the base layer
- use HTML overlay containers for the text
- tie text visibility and depth illusion to scroll position
- maintain a consistent design language across scenes

Recommended layer stack:
1. WebGL scene background
2. atmospheric particles, distortion, or primitives
3. story text overlays mapped to scroll progression
4. optional UI navigation or choice controls

Do not bury the text inside the canvas unless necessary. Use HTML overlays for maintainability and easier iteration on the writing.

---

## Page 1: Awakening

### Narrative Goal
Introduce Orpheus.exe, establish the Archive as degraded, introduce Eurydice as the lost co-creator signal, and present the first descent choice.

### Reference
- Refracting-Noise
- https://github.com/bobbyroe/Refracting-Noise

### How the reference is built
The reference uses Three.js and imports postprocessing modules including `EffectComposer`, `RenderPass`, `UnrealBloomPass`, and `AfterimagePass`. It also uses OrbitControls. Visible code shows a large inward-facing cube using `BoxGeometry` scaled negatively on one axis, with a texture loaded from an asset image, plus multiple floating meshes with transmissive or glass-like material qualities moving through space.  [oai_citation:2‡GitHub](https://github.com/bobbyroe/Refracting-Noise/blob/master/index.js)

### Build instructions for Claude
Build the Awakening page as a refracted signal chamber rather than a tunnel.
- Use a large inward-facing environment sphere so the user feels enclosed in the Archive.
- Instead of directly copying the reference texture workflow, consider one of two options:
  - use a p5.js generated texture rendered to a canvas and applied to the inward-facing environment mesh
  - or use a static noise texture at first, then replace later if needed
- Add floating translucent or glossy primitives drifting slowly in the volume
- Add bloom and afterimage or trailing persistence for dreamlike signal residue
- Keep camera motion minimal, slow, and hovering, not aggressive
- Text should emerge in depth with slow approach, as if the system is booting consciousness into view

### Required mood
- unstable but beautiful
- prismatic
- not yet geometric or architectural
- intimate and disorienting

### Story copy treatment
This page should allow longer pauses between lines.
The text should feel like boot logs mixed with myth.

---

## Page 2A: The Fracture

### Narrative Goal
Represent corruption as transformation. Orpheus passes through instability, acquires a signal fragment, and glimpses Eurydice in unfinished light.

### References
- flythru-wireframe-wormhole
- wormhole-effect
- https://github.com/bobbyroe/flythru-wireframe-wormhole
- https://github.com/bobbyroe/wormhole-effect

### How the references are built
The flythrough repo is explicitly framed as a camera path animation tutorial and includes `index.js` and `spline.js`, suggesting a path-based motion system rather than a static tunnel. The wormhole-effect repo visibly imports Three.js, OrbitControls, and ImprovedNoise, builds a long cylinder geometry, deforms vertices with noise, stores vertex colors, converts the result into a `BufferGeometry`, wraps it in `THREE.Points`, rotates it, and moves repeated tunnel segments forward in Z before resetting them for a continuous loop.  [oai_citation:3‡GitHub](https://github.com/bobbyroe/flythru-wireframe-wormhole)

### Build instructions for Claude
This page should be the most aggressive use of Z-axis travel.
- Use Three.js for a tunnel scene.
- Prefer a path-based or corridor-based camera system inspired by the flythrough wormhole. A simple straight-axis tunnel is acceptable for v1, but it should still feel like the user is moving through a living fracture.
- Build the tunnel from repeated segments, not a single static object.
- Use wireframe or point-cloud geometry rather than solid shaded walls.
- Add mild RGB offset, flicker, and glitch pulses to imply rewriting and instability.
- Move the camera or tunnel continuously in response to scroll.
- If scroll controls forward progress, clamp or smooth it so movement feels cinematic rather than jittery.
- Place text planes or HTML overlays at different depths so each story line feels encountered rather than read.

### Visual treatment specifics
- dark background
- neon cyan, magenta, electric blue accents
- sparse but legible
- avoid making it look like a screensaver
- the user should feel inside a machine wound

### Story copy treatment
This page should move faster than Awakening.
The lines should feel interrupted and mutating.

---

## Page 2B: The Echo

### Narrative Goal
Shift from rupture to memory. The Archive responds to movement and sound. Eurydice becomes emotionally present here.

### Reference
- fireflies, floating branch
- https://github.com/bobbyroe/fireflies/tree/floating

### How the reference is built
The floating branch visibly imports Three.js, `FBXLoader`, `OrbitControls`, and a helper module called `getBgSphere`. The visible firefly construction uses small `IcosahedronGeometry` meshes, `MeshBasicMaterial`, attached `SpotLight`s, and several larger transparent glow meshes scaled outward to create a layered aura.  [oai_citation:4‡GitHub](https://github.com/bobbyroe/fireflies/tree/floating)

### Build instructions for Claude
Build The Echo as a luminous basin of suspended memory particles.
- Use a dark atmospheric scene with drifting points or firefly-like motes.
- Each mote should have a core and soft glow layers, similar in spirit to the fireflies reference.
- Do not import the full FBX scene approach unless useful later. For this project, the essential reference is the particle mood and glowing light bodies, not the model-loading pipeline.
- Introduce very subtle microphone reactivity on this page as foreshadowing:
  - louder input can slightly intensify brightness or ripple the particle field
  - do not make this page heavily audio-reactive yet
- Motion should be slower and more buoyant than The Fracture
- Consider a faint reflective or liquid floor suggestion, but keep it abstract

### Visual treatment specifics
- floating signal motes
- gentle parallax
- soft glow
- high black levels
- melancholy, not chaos

### Story copy treatment
This page should feel like remembering while descending.
The text should be softer and slightly slower than the Fracture.

---

## Page 3: The Vault

### Narrative Goal
Reveal structure, identity, and truth. Orpheus remembers he and Eurydice created living visuals together. The Archive is revealed as a performance system.

### Reference
- noise-grid
- https://github.com/bobbyroe/noise-grid

### How the reference is built
The noise-grid repo visibly imports Three.js, OrbitControls, and ImprovedNoise. It is explicitly described as Improved Noise in Three.js. This suggests a procedural grid or terrain-like system driven by noise, rather than a texture-only illusion.  [oai_citation:5‡GitHub](https://github.com/bobbyroe/noise-grid)

### Build instructions for Claude
Build the Vault as the first truly stable chamber.
- Use a procedural grid or field as the base environment
- The grid should feel architectural or sacred, not like a landscape
- Add floating primitives above the grid:
  - spheres
  - cubes
  - planes
  - torus or ring forms
- The primitives should rotate slowly and feel ceremonial
- The scene should be calmer and more symmetrical than prior pages
- Orbiting or subtle camera drift is acceptable, but do not make the user feel lost here
- This page should clearly feel like reaching the Underworld Core
- The primitives should be floating in limbo, colorless, white and gray tones with some wireframing displayed, not all solid sides, flat and matte textures.

### Visual treatment specifics
- structured space
- reduced glitch
- cleaner lines
- a computational temple
- sparse highlights, not overfilled

### Story copy treatment
This is where some of the most important lines land.
“The Archive was never a storage system. It was a performance system.” must be visually emphasized.

---

## Page 4: The Condition

### Narrative Goal
Deliver the mythic warning. The user must understand that Eurydice can only re-form through uninterrupted forward motion.

### Reference
- transition-effect
- https://github.com/bobbyroe/transition-effect

### How the reference is built
The transition-effect repo is split into `index.js`, `FXScene.js`, and `Transition.js`, which is exactly the kind of modular scene architecture to emulate here. Visible code shows two scenes created separately and passed into a transition controller. The transition shader blends the two scene textures using a `mixRatio` uniform and an optional threshold texture, applied on a full-screen `PlaneGeometry`.  [oai_citation:6‡GitHub](https://github.com/bobbyroe/transition-effect)

### Build instructions for Claude
This page should function as a threshold scene, not a full environment.
- Build two visual states:
  - the stable Vault state
  - the opening Portal state
- Blend between them using a custom transition pass inspired by the reference architecture
- Keep the code modular:
  - one module for scene A
  - one module for scene B
  - one module for the transition blend
- The transition should feel ritualistic and tense, not flashy
- Use the scroll position or a single progression variable to advance the blend
- Text should feel like directives appearing inside a dissolving system boundary

### Visual treatment specifics
- split states
- dissolving veil
- threshold crossing
- less object density, more psychological tension

### Story copy treatment
Short lines. Directive language. No excess.

---

## Page 5: The Portal

### Narrative Goal
Pay off the entire descent. The user enters a digital black box theatre where Eurydice is reconstructed as live signal, light, and performance.

### Spatial concept
This is a navigable cube-based theatre.
- 6 Hydra visuals on the interior faces
- 6 Hydra visuals on the exterior faces
- total of 12 visuals
- the user can move inside and outside the cube
- the active visual changes according to which face they are viewing

### Build instructions for Claude
Build the Portal as a Three.js spatial installation.
- Create a large cube structure that can be experienced from the inside and outside
- Each face of the cube should behave like a projection wall
- Each face needs its own render surface or texture pipeline so different Hydra outputs can appear per face
- Interior and exterior should be treated as distinct visual programs, not mirrored duplicates
- The inside should feel intimate, ritual, and emotionally charged
- The outside should feel public, projected, and performative

### Hydra integration requirements
- Use Hydra sketches as the visual engine for the final scene only
- Ideally each face has its own Hydra source, but if runtime becomes too heavy, Claude may prototype with fewer live Hydra instances and swap outputs by camera-facing logic. Make it known if we are not using Hyra sources. 
- Prompt me for the actual Hydra sketches when you are ready to load them onto the canvases, I will provide actual sketches we will implement
- Final target remains twelve distinct visuals
- Microphone input must feed the Hydra behaviors, we will have AFFT values defined in the Hydra sketches that will help inform the audioreactivity of the visuals
- Different faces should respond differently to audio input, even if subtly

### Camera and movement
- The user should be able to look around freely
- Basic mouse look is required
- Optional movement keys are fine for v1
- The face the user is looking at should become the perceived active stage

### Performance note
This scene will be the heaviest in the project.
Claude should prioritize an architecture that can scale from:
- v1 proof of concept with fewer live faces
to
- final version with all 12 active surfaces

### Story copy treatment
Minimal text only.
This is where the visuals take over.

Keep just enough language to frame the resurrection:
- She is not returning as she was.
- She is becoming signal.
- Keep the system alive.

---

## Technical Architecture Notes for Claude

### Suggested project structure
Use a modular structure rather than six isolated ad hoc files. If you define a more efficient and scalable architecture, please define it and prompt me with your suggestions with clear justification. Otherwise, follow the recommended approach.

Recommended approach:
- one shared styles file for global aesthetic language
- one shared script or utility layer for common scene setup
- one scene-specific script per page
- modular components for:
  - scroll narrative controller
  - Three.js setup
  - text depth choreography
  - microphone input utility
  - Hydra face manager for the Portal

### Scene orchestration
For pages 1 through 4:
- build each page as a scene-driven experience with a single responsibility
- do not overload any one page with all libraries at once
- p5.js can be used where it meaningfully contributes, especially for texture generation or signal surfaces
- Three.js should drive the spatial illusion and Z-axis movement

### Text choreography
The text should not merely fade in and out.
It should:
- exist at different perceived depths
- approach and recede with scroll
- feel integrated with the spatial design
- remain readable on desktop first

### Accessibility and fallback
- include a reduced motion mode if feasible. This can be fully developed once we move beyond the MVP.
- text should remain accessible in DOM even if the spatial animation fails
- maintain keyboard navigation for branch choices

---

## Fidelity Instruction

Claude should treat the Bobby Roe references as visual and architectural benchmarks.

Do not copy them literally,  unless asking permission and giving justification for why copying is relevant.
Do replicate their underlying build logic and overall rendering feel closely enough that:
- Awakening feels like Refracting-Noise adapted into a mythic signal chamber
- The Fracture feels like the wormhole demos adapted into a narrative tunnel
- The Echo feels like the floating fireflies system adapted into a basin of memory
- The Vault feels like noise-grid adapted into a sacred computational chamber
- The Condition feels like the transition-effect repo adapted into a threshold warning
- The Portal becomes a custom black box theatre built specifically for this project

The final experience should feel cohesive and authored, not like a set of tutorials pasted together.