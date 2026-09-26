# Study: Pixel Walker ART BIBLE — SoC technique + our world (PROJECT STANDARD)

- **source**: `C:\Users\never\48bit\reference\ART_BIBLE.md` + `art_bible_sheet.png` (owner-approved work in the 48bit
  art project; exists only on the owner's machine) · approved references: `apps/game/public/assets/avatar/preview/outfits.png`,
  `slash.png` (same files as `48bit\export\pixel_walker_pack\preview\`) · studied: 2026-09-26
- **true size**: character cell 48×64, figure ~45 px, feet at (24, 58) · **colors**: ~25–35 per character · **palette saved as**: not saved (ramps below)
- **subject**: every piece of art for Pixel Walker — player outfits/weapons, monsters, bosses, item/skill icons, effects

> **This card overrides the skill's defaults and every other learned card when drawing for Pixel Walker**
> (e.g. card 001's 26×36 chibi, 3-step ramps, flat cartoon colour). If the ART_BIBLE file is reachable, read it
> in full first — it wins over this summary. Existing first-batch monsters/items in the game are flat and
> off-theme: **never use them as a reference**; ask the owner before redrawing any of them and which goes first.
> ⚠️ Open decision (2026-09-26): MASTER_SPEC §5C (team "32-bit" plan: monsters 64–144 px, icons 48 px,
> hero 64×96) uses different sizes from this bible. Confirm with the owner which scale applies before drawing.

## Measurements (from the approved sheet and the bible's SoC study of 20 characters)
- ramps: **5–6 steps per material**, value **0.15 → 0.90**, **hue shift ~25°** dark→light (shadows toward
  red/purple, or blue for steel; lights toward yellow/warm). Approved ramps (dark → light, darkest = inner line):
  - A01 leather `V0.16→0.85 H349→34` · A01 scarf teal `V0.17→0.71 H224→147` · A01 pants `V0.12→0.63 H252→224`
  - A01 boots `V0.11→0.67 H15→31` · A02 gambeson wine `V0.12→0.80 H330→13` · A02 steel `V0.15→0.93 H232→90`
  - A02 leather `V0.10→0.60 H350→29` · brass/gold `V0.23→1.00 H35→53` · hair black `V0.02→0.51 H240→235` · skin `V0.43→0.96 H5→0`
- outline: **silhouette = 100 % black, 1 px, all sides**; inner lines between parts = **darkest step of that
  material, never black** (SoC uses 0 % black inner lines)
- dithering: none. No gradients, no anti-aliasing
- value range: high contrast — very dark shadow steps, near-white highlights; overall palette muted/earthy with
  small accent spots (gold buckle, teal scarf, wine cloth)

## Observations (pixel level)
- Light from **top, slightly front**; top brighter than bottom, left ≈ right. Centre of chest lit, flanks dark → round volume.
- Shadows are **solid 2–4 px clusters**. No lone pixels, no tight stripes (owner rejected 1-px pocket dots and striped shoulder bands as "junk").
- **Underside of every piece is dark**: under hem, belt, shoulder, chin. Hem always has one dark row = cloth thickness.
- **Far arm 1 step darker** than near arm for its whole length. Back view has no bright highlight spots.
- Metal: very bright lit edge with **one glint** at the front edge, thin vertical light band mid-plate, dark sides;
  plates narrower than 5 px get no band.
- Clothing is **1–2 px thicker than the body** on every side (not paint on skin); hem flares 1–2 px over 2–4 rows of thigh;
  in stride poses the hem is **one sheet** hanging across the leg gap.
- Value descends top→bottom: shirt mid → trousers darker → boots darkest with a lit top edge. Belt ~3 rows above crotch, 1–2 px gold/silver buckle.
- Each outfit has **its own neck design** (scarf/collar for cloth, gorget for armour) — never reuse the same neck strip.
- Break up the torso with a diagonal strap or an overlapping piece. Hands are always skin (bare, bracer or glove end).
- Faces: dark lash row + 3 rows of eye white; near eye 2 white + 1 px iris, far eye ~2 px; **no nose, no mouth**; chin 2–3 px below the eyes.

## Rules to apply (imperative)
- **Sizes (same pixel size everywhere, never draw small and upscale):** character cell 48×64 (figure ~45, head 18–20 px ≈ 40–43 %),
  small monster 32, mid 40–56, boss 64–72, item/skill icon 24×24 (object 20–22 px, 1–2 px margin), effect 48×48 per frame.
  Scale only by whole-number nearest-neighbour. Density test: place the new art beside our character at 1× — shadow
  clusters, step count and outline weight must match; emptier/flatter = fail.
- **Facing:** 3/4 view facing RIGHT; left is a mirror of the whole stack. Monsters stand on the ground, feet point bottom-centre.
- **Player characters: never draw a new body.** Use the avatar-pack base (`body/<frame>.png`); outfits are layers on the
  same 48×64 cell named after the body frame. Frames: `wait_0–12`, `move_0–7`, plus every action (e.g. `slash_0–2`).
  Identical body frames get pixel-identical outfit frames (idle groups [0,1] [2,3,4,5] [6] [7] [8,12] [9] [10] [11]).
  Front/back follows the torso, not the eyes (`wait_1/3/5` = front, `wait_12` = back).
- **Layer order:** fx (behind) → body → outfit → hair → helmet → weapon → hand. Dyeable parts = grey tone map
  (`level = round(grey/40)`), otherwise full colour.
- **Action poses:** start from an existing body frame, erase only the moving limb, redraw it on a constant slope
  (flat, 1:3, 1:2, 1:1), 3 px thick, lit top, shaded underside, full black outline (limbs crossing the torso get black
  on **both** sides); rebuild the torso as one clean mass. Timing: wind-up ~260 ms → strike ~90 ms (hit) → follow-through ~300 ms → idle; feet stay planted.
- **Weapons:** short sword blade ~14 px long, 2 px wide; lit edge near-white, centre light grey, other edge mid grey,
  tapering over the last 3 px; brass guard 5 px across; leather grip; black outline around the whole weapon; the fist covers the grip end.
- **Monsters/bosses:** exactly the character technique. Pixel layer (ranks E–C) = funny transformed Thai city things,
  still fully shaded; myth layer (B–S) = solemn Lanna — gold/stone/jade, deep shadows, dignified poses.
  Minimum anims: idle/breath 2–4 f, attack 3 f (wind-up/strike/return), hit 1–2 f.
- **Effects:** **no black outline**; 3–4 colours dark element tone → light → white at the leading edge
  (slash: `#5a9ad0 → #9cd0f0 → #e4f6ff → #ffffff`); crescent, thin tail, thick head on the weapon side; trails behind
  the body, impacts/sparks on top; drop any frame that fades to 1–2 stray pixels.
- **Icons:** black outline, 4–6 steps per material hue-shifted, lit from top-front, 3/4 view; an item that also appears
  on the character uses the same ramp as its layer.
- **Workflow (do not skip):** check STORY.md layer + size + frames → open references → pick ramps (≤ ~35 colours) →
  silhouette at 1× → flat mid tones → clustered shading → inner lines → black outline → accents → animate one key frame
  first, owner approves, then the rest → self-check at 1×/3×/8× with grid beside our character → send the owner a
  `review_*.png` (zoom with grid + in-game 3× + approved work beside it, **frame numbers written on the image**) →
  fix the cause, not the symptom → lock approved files in `approved/`, export in the game's format.
- **One pose / one piece at a time.** Next only after the owner approves.

## Do NOT copy
- Flat cartoon with 2–3 bright shades, 8-bit retro, pillow shading, speckled pixels, gradients / AA / dither.
- All-black inner lines; missing black silhouette outline.
- Any SoC pixel: study method only — never copy, trace or recolour SoC art (© XD Inc.). The base body and hairstyles are
  owner-approved temporary placeholders only. Our file names: `M01_…`, `F01_…`, `A01_…`, `W01_…` — never SoC unit names.
- Hand-editing avatar-pack PNGs inside the game repo — report art problems to the 48bit side.
- Shipping anything that has not passed the checklist below and been inspected zoomed.

## Pre-delivery checklist (every item comes from an owner correction)
- [ ] Right size; at 1× beside our character the density matches
- [ ] Black silhouette with no gaps; inner lines not black (except limbs crossing the body in action poses)
- [ ] Every material 5–6 hue-shifted steps; no "base colour mixed with black" shadows
- [ ] No lone pixels, no tight stripes, no effect specks
- [ ] Undersides dark, hem has a thick shadow row, clothing 1–2 px thicker than the body
- [ ] Neck design belongs to this outfit
- [ ] Idle: identical body frames → identical outfit pixels
- [ ] Front/back follows the torso (wait_1/3/5 front, wait_12 back)
- [ ] Stride: hem is one sheet, not strips on each leg
- [ ] Action: arms not bent/twisted, shoulders not deformed, no leftover old lines on the torso
- [ ] No colour of one piece bleeding onto another (e.g. scarf end over a swinging arm)
- [ ] Faces right, 3/4, foot point correct
- [ ] No SoC pixels; our own file names
