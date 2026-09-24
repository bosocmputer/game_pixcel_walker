# Avatar pack: body + hairstyles + outfits + sword slash (for Pixel Walker)

This folder is a ready-made **avatar layer pack**. Every layer is already aligned to the body frame by
frame, so the game only **stacks images** in a fixed order and **recolours** skin/hair.
No alignment math is needed on the game side.

> ⚠️ **PROTOTYPE / PLACEHOLDER ART.** The body and the hairstyles were derived from *Sword of Convallaria*
> (XD Inc.) for internal prototyping. Keep them behind the dev flag (`USE_AVATAR_PACK`) and never ship them
> in a public build, store release or public repo. The **outfits, the sword, the slash trail and the slash
> arm pose are our own drawings**, but they sit on the placeholder body, so the whole pack stays internal.
> Original art will later replace it with the same layout (same cells, names and encodings), so the code
> should not need to change.

## What is in the folder

```
pixel_walker_pack/
├── manifest.json                 ← read this first: cells, anims, draw order, ramps, styles, outfits, actions
├── body/<frame>.png              ← grey mannequin, one PNG per frame (48×64 cell)
│                                    wait_0..12 (idle), move_0..7 (walk), slash_0..2 (sword slash)
├── hair/<male|female>/<style>/<frame>.png   ← hair tone maps (same cell), incl. slash_0..2
├── outfit/A01_starter_leather/<body frame>.png   ← outfit 1: leather   (full colour)
├── outfit/A02_light_armor/<body frame>.png       ← outfit 2: light armor (full colour)
├── weapon/W01_short_sword/slash_0..2.png  ← the sword during the slash (full colour)
├── hand/slash_0..2.png           ← the fist, drawn OVER the sword grip (grey, recolour like the body)
├── fx/slash/slash_0..2.png       ← slash trail (full colour, frame 2 only has pixels; drawn BEHIND the body)
└── preview/                      ← how it must look: <style>.png, outfits.png, slash.png (4× zoom)
```

## Rules (also in manifest.json)

1. **Cell & anchor** – every PNG is 48×64. The feet are at `(24, 58)` in every cell. Put that point on the
   character's world position. Nearest-neighbour scaling only.
2. **Draw order** – `fx` (slash only) → `body` (skin recoloured) → `outfit` → `hair` → `weapon` (slash only)
   → `hand` (slash only, skin recoloured). All at the same position and scale.
3. **Animations per style** – `styles[i].anims`:
   - `idle` (6–10 frames), `walk_front` (4), `walk_back` (4)
     – each frame is `{ "body": "body/...png", "hair": "hair/.../...png" }`
   - `slash` (3 frames: wind-up, strike, follow-through) – each frame also has `hand`, `weapon`, `fx`.
     Timing `actions.slash.frame_ms = [260, 90, 300]`; the hit lands on frame index 1; then return to idle.
   **Always use the body file listed next to the hair** — idle frames of different styles point to
   different body frames on purpose.
4. **Outfits** – `manifest.outfits` lists them (`A01_starter_leather` ชุดหนังเริ่มต้น, `A02_light_armor`
   ชุดเกราะเบา). **Outfit file = `outfit/<outfit id>/` + the file name of `frame.body`**
   (e.g. `body/wait_8.png` → `outfit/A02_light_armor/wait_8.png`, `body/slash_1.png` →
   `outfit/A02_light_armor/slash_1.png`). Every body frame (idle, walk, slash) has an outfit file.
   Outfits are full-colour RGBA — do **not** recolour them (tone maps for dyeing come later). They are
   unisex and already include shirt, trousers, boots, bracers and the neck piece, so when a pack outfit is
   worn the game must **not** also paint its procedural shirt / legwear / boots.
5. **Facing** – all art faces RIGHT; for left, mirror the whole stack around the anchor. Game `Facing`:
   `down` → `walk_front`, `side` → `walk_front` (mirror when moving left), `up` → `walk_back`.
   The slash is drawn facing right/down-right; mirror it the same way.
6. **Recolour the body and hand (skin)** – exact greys: `#474747` skin shadow, `#8a8a8a` skin base,
   `#010101` outline/pupil (keep), `#dbdbdb` eye white (keep). Skin tones: `manifest.body.example_skin_tones`.
7. **Recolour the hair** – grey tone maps: `level = round(grey / 40)`, colour = `ramp[min(level, 5)]` with a
   6-entry ramp where `ramp[0]` is the outline. Ramps: `manifest.hair_color_ramps`.
8. **Gender** – one body for both genders; gender only filters the hairstyles (`styles[i].gender`).

## Where it plugs into the game (current code)

- `apps/game/src/game/avatar.ts` – loader/renderer. Extend `AvatarAnimFrame` with optional
  `hand? / weapon? / fx?`, `AvatarStyle.anims` with `slash`, `AvatarAnim` with `'slash'`, and the manifest
  type with `outfits` / `actions`. `compositeAvatar()` must load the outfit file (rule 4) and the slash
  layers, and include the outfit id in the cache key.
- `apps/game/src/game/gear.ts` – `composeAvatar()`: when the look has a pack outfit, draw that PNG after the
  skin and **skip** `paintLegwear / paintBoots / paintChest`; then hair, helmet, weapon as before. For the
  slash anim draw `fx` first, and `weapon` + `hand` last (the pack sword replaces the procedural weapon
  during the slash). Pass the extra layers' pixels in the same way `hair` is passed.
- Items: link outfits to chest-slot equipment (`packages/shared/src/data/items.ts`, `EquipmentDef.sprite`),
  e.g. a new sprite key per outfit id. **Ask the owner** which items and stats — don't invent them.
- Also update `tools/artpreview/avatar.mts` if it calls `composeAvatar`.
- Without a pack outfit everything must keep working exactly as now.

## Minimal recolour sketch (TypeScript, canvas)

```ts
// grey tone map -> coloured canvas. ramp = 6 hex colours, ramp[0] = outline
function recolorHair(img: HTMLImageElement, ramp: string[]): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const rgb = ramp.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  for (let i = 0; i < d.data.length; i += 4) {
    if (!d.data[i + 3]) continue;
    const [r, gg, b] = rgb[Math.min(Math.round(d.data[i] / 40), 5)]!;
    d.data[i] = r; d.data[i + 1] = gg; d.data[i + 2] = b;
  }
  g.putImageData(d, 0, 0); return c;
}
// body + hand: replace exact greys 0x47 (shadow) and 0x8a (base) with the chosen skin tone the same way.
```

## Where the pack comes from

Generated by `C:\Users\never\48bit\study\export_pack.py` (Python) — this file is `study/pack_HANDOFF.md`.
When new hairstyles, outfits or actions are added, the pack is re-exported with the same layout: copy the
whole folder again. Do not edit the PNGs by hand inside the game repo; report art problems to the 48bit side.
