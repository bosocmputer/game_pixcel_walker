# Pixel Walker (ก้าวข้ามมิติ) — Claude guide

Location-based RPG for the browser: a real map background (MapLibre + OpenFreeMap, `game/map.ts`)
with 16-bit sprites drawn on a transparent Phaser canvas; gameplay terrain/landmarks are decoded from the
same vector tiles (`game/world.ts`). The player community launches in Chiang Mai. The owner is a solo developer
who builds with Claude and speaks Thai — reply in Thai, keep code/comments in English.

**Design source of truth: `docs/MASTER_SPEC.md`.** `docs/source/` holds the original docs;
where they disagree with MASTER_SPEC, MASTER_SPEC wins. Update MASTER_SPEC when a design decision changes.

## Layout
```
packages/shared   Game rules + data, pure TypeScript, no DOM. Used by client AND server.
  src/data        classes, skills, mutations, items, monsters — tune numbers here
  src/combat      party auto turn-based engine, dungeons (see docs/COMBAT_SPEC.md)
  src/rules       progression, stats, spawns, walk validation, loot, economy, rng
apps/game         Phaser 3 + Vite PWA client
tools/osm         Legacy offline baker (OSM → tilemap for one city); the game streams tiles live now
tools/artpreview  Renders map/sprite sheets to PNG for reviewing procedural art without a browser
supabase/         (Phase 1) migrations + edge functions — server-authoritative rewards
```

## Commands
```
npm install
npm test            # vitest for packages/shared
npm run typecheck
npm run dev         # game at http://localhost:5173
npm run map:build && npx tsx tools/artpreview/preview.mts [lat lng]   # map art sheet (needs a baked map)
npx tsx tools/artpreview/heroes.mts
```

## Rules for changes
- **All game math lives in `packages/shared`**, never in Phaser scenes. Scenes only render and send commands.
- Combat is auto turn-based (Pocket Ninja style: skills rolled from the player's loadout) and must stay
  **deterministic** from `(setup, seed)` — use the battle `rng`, never `Math.random()` inside rules.
  The replay test guards this.
- Rewards (EXP, gold, drops, stat points) are decided by the server in production; the client may
  preview them but must not be trusted.
- Privacy: a stranger's real coordinates never leave the server (MASTER_SPEC §12).
- No real brand names in player-facing text; landmarks use generic categories.
- Add or update a vitest case for any rule change. Run `npm test` and `npm run typecheck` before finishing.
