# Pixel Walker (ก้าวข้ามมิติ) — Claude guide

Location-based RPG for the browser: a real map background (MapLibre + OpenFreeMap, `game/map.ts`)
with 16-bit sprites drawn on a transparent Phaser canvas; gameplay terrain/landmarks are decoded from the
same vector tiles (`game/world.ts`). The player community launches in Chiang Mai. A small Thai team builds it
with Claude Code — reply in Thai, keep code/comments in English.

**Design source of truth: `docs/MASTER_SPEC.md`.** `docs/source/` holds the original docs;
where they disagree with MASTER_SPEC, MASTER_SPEC wins. Update MASTER_SPEC when a design decision changes.
How to install/run everything: `README.md`.

## กฎการทำงานของทีม (บังคับ)

หลายคนทำโปรเจกต์นี้สลับกัน ทุกคนใช้ Claude Code — กฎนี้มีไว้ให้คนถัดไปรู้เสมอว่าเกิดอะไรขึ้น

**ก่อนเริ่มงานทุกครั้ง**
1. `git pull` ให้เป็นล่าสุด แล้ว `npm install` (เผื่อมี dependency ใหม่)
2. อ่าน `docs/ROADMAP.md` และ 3 รายการบนสุดของ `CHANGELOG.md` แล้วสรุปสถานะให้คนสั่งงานฟังสั้น ๆ
3. ถ้างานที่จะทำอยู่ใน ROADMAP ให้ใส่ชื่อคนรับงานไว้ในหัวข้อ "กำลังทำ" จะได้ไม่ทำชนกัน

**หลังทำงานเสร็จ (ก่อน commit) — ขาดไม่ได้**
1. เพิ่มรายการ **บนสุด** ของ `CHANGELOG.md` ตามรูปแบบในไฟล์: วันที่ · หัวข้อ · ชื่อคนทำ · เพิ่ม / แก้ไข / แก้บั๊ก ·
   ไฟล์หลักที่แตะ · ผลทดสอบ · งานค้าง/ข้อควรรู้ (1 งาน/1 session = 1 รายการ, เขียนภาษาไทย)
2. อัปเดต `docs/ROADMAP.md`: ย้ายงานที่เสร็จไป "เสร็จแล้ว", เพิ่มงานใหม่/ปัญหาที่เจอ/เรื่องที่รอตัดสินใจ, แก้วันที่อัปเดต
3. ถ้าเปลี่ยนดีไซน์เกม (ตัวเลข สูตร กติกา) → อัปเดต `docs/MASTER_SPEC.md` (และ `docs/COMBAT_SPEC.md` ถ้าเกี่ยวกับการต่อสู้)
4. ถ้าเพิ่ม/เปลี่ยนวิธีรัน คำสั่ง พอร์ต หรือ env → อัปเดต `README.md`
5. รัน `npm test` และ `npm run typecheck` ให้ผ่าน ถ้าไม่ผ่านห้าม commit (หรือเขียนเหตุผลไว้ใน CHANGELOG ช่อง "ค้าง")

**Git**
- ทำงานบน branch ของตัวเอง: `feature/<เรื่อง>` หรือ `fix/<เรื่อง>` แล้วเปิด Pull Request เข้า `main`
  (แก้เอกสารเล็ก ๆ push เข้า `main` ตรงได้) — ก่อน push ให้ `git pull --rebase` เสมอ
- ข้อความ commit ภาษาอังกฤษ บรรทัดแรกบอกว่าทำอะไร เช่น `Party co-op field fights`
- ห้าม commit ไฟล์ลับ (`.env`, คีย์ API, รหัสผ่าน) และ `node_modules/`, `dist/`
- ห้าม force-push `main`

## Layout
```
packages/shared   Game rules + data, pure TypeScript, no DOM. Used by client AND server.
  src/data        classes, skills, mutations, items, monsters — tune numbers here
  src/combat      party auto turn-based engine, dungeons (see docs/COMBAT_SPEC.md)
  src/rules       progression, stats, spawns, walk validation, loot, economy, rng
apps/game         Phaser 3 + Vite PWA client
apps/server       Presence server (Node + ws): nearby players, parties, dungeon/field runs — protocol in packages/shared/src/net
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
npm run dev:all     # presence server + game
npm run dev:lan     # same over HTTPS for phones on the Wi-Fi (https://<pc-ip>:5173)
npm run map:build && npx tsx tools/artpreview/preview.mts [lat lng]   # map art sheet (needs a baked map)
npx tsx tools/artpreview/heroes.mts
npx tsx tools/artpreview/avatar.mts   # avatar pack + equipment layers → tools/artpreview/avatar.png
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
