# Avatar pack: base body + hairstyles (for Pixel Walker)

This folder is a ready-made **avatar layer pack**: one blank body (mannequin) plus hairstyles that are
already aligned to it, frame by frame. The game only has to **stack two images** (body, then hair) and
**recolour** them. No alignment math is needed on the game side.

> ⚠️ **PROTOTYPE / PLACEHOLDER ART.** The pixels were derived from *Sword of Convallaria* (XD Inc.) for
> internal prototyping. Do **not** ship them in any public build, store release, or public repo.
> Keep them behind a dev flag and plan to swap in original art with the same layout (same cells, same
> tone encoding), so the code does not change when the art is replaced.

## What is in the folder

```
pixel_walker_pack/
├── manifest.json            ← read this first: cells, anims, tone encoding, colour ramps, style list
├── body/<frame>.png         ← grey mannequin, one PNG per frame (48×64 cell)
├── hair/male/<style>/<frame>.png
├── hair/female/<style>/<frame>.png   ← hair "tone maps", same 48×64 cell, already aligned to the body frame
└── preview/<style>.png      ← how it should look (body + black hair), 4× zoom
```

Styles right now (see `manifest.json → styles`):

| id | gender | Thai label |
|---|---|---|
| M01_short_messy | male | ผมสั้นยุ่ง |
| M02_shaggy_bangs | male | ผมฟู หน้าม้าปรกตา |
| M03_short_neat | male | ผมสั้นเรียบร้อย |
| F01_low_ponytail | female | หางม้าต่ำ |
| F02_bun | female | ผมเกล้ามวย |
| F03_wavy_shoulder | female | ผมยาวประบ่าปลายหยัก |

More styles will be added later **with the same format** — the game should read the list from
`manifest.json`, not hard-code it.

## The rules (all also in manifest.json)

1. **Cell & anchor** – every PNG is a 48×64 cell. The character's feet are at `(24, 58)` in every cell.
   Put that point on the character's world position.
2. **Draw order** – `body` first, then `hair` on top, same position, same scale. Use nearest-neighbour
   scaling only (pixel art, no smoothing).
3. **Animations per style** – `styles[i].anims`:
   - `walk_front` (4 frames): walking toward the camera, facing down-right
   - `walk_back` (4 frames): walking away, facing up-right
   - `idle` (6–10 frames): standing, the head turns around a little
   Each frame is `{ "body": "body/move_0.png", "hair": "hair/male/M01_short_messy/move_0.png" }`.
   **Always use the body file listed next to the hair** — idle frames of different styles point to
   different body frames on purpose.
4. **Facing** – all art faces RIGHT. For left, mirror the whole stack horizontally around the anchor.
   Mapping for the game's `Facing = 'down' | 'up' | 'side'` (`apps/game/src/game/art.ts`):
   `down` → `walk_front`, `side` → `walk_front` (mirror when moving left), `up` → `walk_back`
   (mirror when moving left). Standing still → `idle` (or frame 0 of the walk).
5. **Recolour the body (skin)** – body PNGs use exact greys:
   `#474747` → skin shadow, `#8a8a8a` → skin base, `#010101` outline/pupil (keep), `#dbdbdb` eye white (keep).
   Example skin tones are in `manifest.json → body.example_skin_tones`.
6. **Recolour the hair** – hair PNGs are grey tone maps: `level = round(grey / 40)`.
   `level 0` = outline, `1..6` = dark → light. Colour = `ramp[min(level, 5)]` with a 6-entry ramp
   where `ramp[0]` is the outline colour. Ready ramps: `manifest.json → hair_color_ramps`
   (black, blonde, silver, red, blue). Any new hair colour = just a new 6-colour ramp.
7. **Gender** – the pack has one body for both genders; gender only filters which hairstyles the player
   can pick (`styles[i].gender`).

## What the game needs to change (suggested plan)

1. Copy this folder to `apps/game/public/assets/avatar/` (Vite serves `public/` as-is).
2. Load `manifest.json` and preload the PNGs listed in it (Phaser loader, or plain `Image` → canvas).
3. Recolour once per (frame, skin, hairColor) into an offscreen canvas and cache it — do not recolour
   every frame.
4. Extend `Appearance` (`apps/game/src/game/art.ts`, `packages/shared/src/net/protocol.ts`, save data in
   `state/store.ts`): add `gender: 'male' | 'female'`; `hairStyle` becomes a style `id` from the manifest;
   `hairColor` indexes the ramp list; `skin` indexes the skin tone list. Give old saves a default
   (e.g. `gender: 'male'`, `hairStyle: 'M01_short_messy'`) so nothing breaks.
5. Character creator (`ui/creator.ts`): add a gender toggle; the hairstyle arrows cycle only the styles of
   that gender; show a live preview using the new renderer.
6. Keep the old procedural 16×24 hero as a fallback behind a flag (e.g. `USE_AVATAR_PACK`) until the
   new one is approved. The new sprite is ~45 px tall vs 24 px now, so adjust the display scale on the map.
7. **Known gap: there are no clothes yet** — the body is a bare mannequin. Until an outfit layer exists,
   keep the new avatar behind the dev flag (or draw a temporary simple outfit layer between body and hair).
   Equipment (helmet/chest/weapon/boots) is also not in this pack yet.

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
// body: replace exact greys 0x47 (shadow) and 0x8a (base) with the chosen skin tone the same way.
```

## Where the pack comes from

The pack is generated by `C:\Users\never\48bit\study\export_pack.py` (Python). When new hairstyles are
added there, the pack is re-exported with the same layout — just copy the folder again. Do not edit the
PNGs by hand inside the game repo.
