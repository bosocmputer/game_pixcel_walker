# Study: Chibi turning melee combo

- **source**: `C:\Users\never\48bit\SoC_units\solomonMafiabossMset01\frames\solomonMafiabossMset01_attack_0.png` through `_attack_9.png` · studied: 2026-09-24
- **true size**: 27–38×41–54 px (1×) · **colors**: 30–36 per frame · **palette saved as**: not saved
- **subject**: a compact 3/4 chibi humanoid performing a body-led melee combo with a turn through the back-facing silhouette.

## Measurements (from report.json)

- ramps: warm brown/red clothing and hair use wide, irregular dark-to-light clusters; neutral skin/white accents use a short high-value ramp.
- outline: near-black one-pixel external outline; reported dark edge is 100%.
- dithering: 1.63–3.89% checker score, used sparingly in hair/clothing texture rather than on moving silhouette edges.
- value range: near-black to white; contrast is reserved for the face and weapon/hand focal points.

## Observations (from LOOKING at zoom.png — pixel-level, specific)

- The action reads because the torso, leading shoulder, legs, and head all redraw into distinct poses; it is not a rotated standing frame.
- The first poses compact the body and pull the leading arm back. The contact pose reaches forward, widens the stance, and shifts the torso toward the target.
- Mid-combo frames temporarily show the back-facing hair/shoulder mass; the broad dark cluster makes the turn readable without relying on effects.
- Feet share a stable ground line even when the torso leans. The head is offset only a few pixels, while the arm/weapon arc supplies most of the perceived speed.
- Hair, coat, and belt stay in solid clusters while moving. Highlights are concentrated on face, hands, and gold trim; no noisy dither is animated.

## Rules to apply (imperative — used when creating in this style)

- Build a melee action from keyed silhouettes: anticipation, forward contact, follow-through, and recovery; never animate an attack by rotating an idle sprite.
- Keep the feet/pivot fixed across every attack frame; move the body mass, shoulder, arm, and weapon independently.
- Hold the extended contact pose long enough to read, and use one short weapon smear or arc only on impact.
- Use solid, high-contrast clusters for all moving limbs and cloth; reserve texture/dither for static interior detail.
- Keep the character original: adopt only the general pose timing and silhouette principles, never the source character, palette, or pixel clusters.

## Do NOT copy

- Do not reuse the source character's hairstyle, clothing shapes, warm-brown palette, or frame pixels.
- Do not reproduce its turning-back silhouette as a trace; create a new model and its own combat identity.
