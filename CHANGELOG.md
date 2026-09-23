# บันทึกการเปลี่ยนแปลง (CHANGELOG)

ทุกครั้งที่แก้โปรเจกต์ **ต้องเพิ่มรายการที่ด้านบนสุด** ของไฟล์นี้ (ใหม่สุดอยู่บน) — กฎเต็มดูที่ [CLAUDE.md](CLAUDE.md#กฎการทำงานของทีม-บังคับ)
เป้าหมาย: ใครก็ตาม (คนหรือ agent) เปิดไฟล์นี้แล้วรู้ทันทีว่า "ล่าสุดทำอะไรไป เพิ่มอะไร แก้อะไร ค้างอะไร"

## รูปแบบ (copy ไปใช้)

```markdown
## YYYY-MM-DD — หัวข้อสั้น ๆ (ชื่อคนทำ)
**เพิ่ม**
- ...
**แก้ไข / เปลี่ยน**
- ...
**แก้บั๊ก**
- ...
**ไฟล์หลักที่แตะ:** `path/a.ts`, `path/b.ts`
**ทดสอบ:** npm test (xx ผ่าน) · typecheck ผ่าน · ทดสอบมือ: ...
**ค้าง / ข้อควรรู้:** ... (ถ้าไม่มีให้เขียน "-")
```

---

## 2026-09-23 — ติดตั้ง skill วาด pixel art (pixel-art-studio) ให้ทั้งทีม (Nong + Claude)
**เพิ่ม**
- `.claude/skills/pixel-art-studio/` จาก https://github.com/Gamezxz/pixel-art-studio (MIT, commit `f8c2466`) —
  Claude วาด pixel art ด้วยสคริปต์ Python + Pillow แล้วเปิดดู/ตรวจ/แก้วนซ้ำ ส่งออก PNG / GIF / spritesheet+JSON
  (ตัดภาพตัวอย่างใน `docs/` และ `pixel-art/` ของต้นฉบับออก เหลือ 285 KB · ที่มาอยู่ใน `UPSTREAM.txt`)
- กฎงานภาพใน `CLAUDE.md` (หัวข้อ Pixel art): งานภาพนิ่งใหม่ใช้ skill นี้ เก็บ `pixel-art/<slug>/build.py` ไว้ใน git เป็นต้นฉบับ
- README: วิธีติดตั้ง Pillow สำหรับคนทำงานภาพ
**ทดสอบ:** ตรวจสคริปต์ทุกไฟล์แล้ว ไม่มีการต่อเน็ต/รันคำสั่งระบบ · ติดตั้ง Pillow 12.3 · รันตัวอย่างสไลม์ 4 เฟรมได้ PNG/GIF/spritesheet ครบ
**ค้าง / ข้อควรรู้:** เครื่องที่จะใช้ skill ต้อง `python -m pip install --user pillow` ก่อน · skill ช่วยงานภาพนิ่ง (ไอคอน มอนสเตอร์ ตัวละครของแท้)
ส่วนอุปกรณ์บนตัวละครยังวาดสดด้วย `gear.ts` เหมือนเดิม

## 2026-09-23 — เลือกอุปกรณ์ในหน้าสร้างตัวละคร + ระบบสวมใส่แสดงบนตัวละคร (Nong + Claude)
**เพิ่ม**
- หน้าสร้างตัวละครมีส่วน "🎒 อุปกรณ์เริ่มต้น": งบ 500 Gold เลือกใส่ทีละช่อง (หัว/ตัว/อาวุธ/เท้า/ยา) ชิ้นที่ไม่ใส่เก็บเป็นทอง
  มีปุ่มลัด "ใส่ครบชุด" / "ตัวเปล่า" และพรีวิวตัวละครใส่ของจริงแบบสด — **แทนหน้าเลือก A/B (Naked Dilemma) เดิม**
- ระบบวาดอุปกรณ์บนตัวละคร 48×64 (`apps/game/src/game/gear.ts`): เสื้อผ้าฝ้าย (ย้อมตาม "สีเสื้อ"), เกราะหัวจ่ายน้ำมัน,
  หมวกเหล็ก, ผ้าโพกหัว, รองเท้าวิ่ง, รองเท้าแตะ, ดาบไม้, ดาบพิกเซล, กระบองโบโลน่า, ไม้เท้าฝึกหัด, คทาละอองดาว, โล่อีจีส, ชุดชั้นใน
  - วาดจากรูปร่างหุ่นของแต่ละเฟรม (เส้นขอบ/เงา/สีพื้น) → ชุดขยับตามทุกท่าเดิน/ยืนเอง ไม่ต้องวาดแยกทีละเฟรม
  - อาวุธถืออยู่ที่มือที่หาเจอในแต่ละเฟรม · ไม้เท้าอยู่หลังตัว หัวคทาอยู่หน้าสุด
- ไอเทมใหม่ 3 ชิ้น: ผ้าโพกหัว (DEF+1), รองเท้าแตะสาน (AGI+1), ไม้เท้าฝึกหัด (MATK+5) — ขายที่ร้านบ้านด้วย
- `packages/shared/src/rules/starter.ts` (คิดทองเริ่มต้น + กันเลือกของนอกรายการ) + เทสต์ 5 ข้อ
- เครื่องมือ `npx tsx tools/artpreview/avatar.mts` เรนเดอร์ทุกชุด × ทุกท่าเป็นภาพ PNG (ไม่ต้องติดตั้งอะไรเพิ่ม)
**แก้ไข / เปลี่ยน**
- ราคาเสื้อผ้าฝ้าย/ดาบไม้ 20 → 150 Gold ให้เท่ากับราคาในหน้าสร้างตัวละคร (ใส่ครบ = เหลือ 50 G, ตัวเปล่า = 500 G เท่าเดิม)
- ปุ่ม "สีชุด" เปลี่ยนเป็น "สีเสื้อ" และจะกดได้เฉพาะตอนใส่เสื้อผ้าฝ้าย
- `Paperdoll` / `PlayerLook` มีช่อง `offhand` (โล่แสดงบนตัว และผู้เล่นอื่นเห็นด้วย)
- `SaveData.starter` เพิ่มค่า `'CUSTOM'` (เซฟเก่า STANDARD/NAKED ยังใช้ได้)
**ไฟล์หลักที่แตะ:** `apps/game/src/game/gear.ts` (ใหม่), `apps/game/src/game/avatar.ts`, `apps/game/src/ui/creator.ts`, `apps/game/src/ui/hud.ts`, `apps/game/src/state/store.ts`, `packages/shared/src/data/items.ts`, `packages/shared/src/rules/starter.ts`, `tools/artpreview/avatar.mts`, `tools/artpreview/png.ts`
**ทดสอบ:** npm test (63 ผ่าน) · typecheck ผ่าน · build ผ่าน · ทดสอบในเบราว์เซอร์: สร้างตัวละคร (เพศหญิง+เสื้อ+ไม้เท้า+ยา → เหลือ 150 G ถูกต้อง), เห็นชุดบนแผนที่และฉากต่อสู้, ถอดของในกระเป๋าแล้วตัวละครเปลี่ยนทันที, หน้าจอมือถือ 375 px
**ค้าง / ข้อควรรู้:** แหวนไม่แสดงบนตัว (ตั้งใจ) · ไอเทมใหม่ต้องมี `sprite` ที่ `gear.ts` รู้จัก ไม่งั้นจะไม่เห็นบนตัว · ภาพหุ่นยังเป็น Prototype (Sword of Convallaria) — ระบบอุปกรณ์วาดจากรูปร่างหุ่น จึงใช้ต่อได้เมื่อเปลี่ยนเป็นภาพของเราเองที่ layout เดิม

## 2026-09-23 — อัปเดต Roadmap กราฟิก (32-bit HD-2D Transition) และสรุปสถานะ Avatar Pack บน main (Claude)
**เพิ่ม**
- `docs/ROADMAP.md`: เพิ่มรายละเอียดแผนการพัฒนางานภาพสู่ 32-bit HD-2D:
  - วาด Asset อวาตาร์ของแท้ (Original Art 48×64) เพื่อทดแทน Prototype Asset ก่อนเปิด Public
  - แผนจัดทำ Dedicated Monster Pack ความละเอียดจริง (32–48 px, บอส 64 px) เพื่อแก้ปัญหาสไปรต์ยืดพิกเซล (Mixels)
  - แผนพัฒนาระบบเลเยอร์เสื้อผ้า/อุปกรณ์ (Equipment/Outfit Layering) บนหุ่น 48×64
  - เพิ่มหัวข้อรอตัดสินใจ: ทิศทางความละเอียดสไปรต์ (16-bit vs 32-bit HD-2D) และระบบชุด (Modular vs Full Outfit)
  - บันทึก Checklist และข้อจำกัดลิขสิทธิ์ของ Prototype Asset ใน Known Limitations
**แก้ไข / เปลี่ยน**
- รวม `feature/avatar-pack` เข้าสู่ branch `main` และ push ขึ้น GitHub (`origin/main`) สำเร็จ
- อัปเดตสถานะใน `CHANGELOG.md` และ `docs/ROADMAP.md` ให้สอดคล้องกับโค้ดล่าสุดบน `main`
**ไฟล์หลักที่แตะ:** `docs/ROADMAP.md`, `CHANGELOG.md`
**ทดสอบ:** npm test (58 ผ่าน) · typecheck ผ่าน
**ค้าง / ข้อควรรู้:** Asset ตัวละคร 48×64 ปัจจุบันเป็น Prototype Placeholder จาก Sword of Convallaria สำหรับทดสอบภายในเท่านั้น ห้ามเผยแพร่เชิงพาณิชย์

## 2026-09-23 — นำเข้า Avatar Pack (Base Body + Hairstyles) แทนตัวละครเดิม (Claude)
**เพิ่ม**
- Avatar Pack: คัดลอก assets (body, hair, manifest) ทั้งหมด 115 ไฟล์ไปที่ `apps/game/public/assets/avatar/`
- `apps/game/src/game/avatar.ts`: ตัวโหลด manifest แบบ dynamic, ตัวแปลงสี (recolor) ผิว/ผมตาม tone encoding ใน HANDOFF.md, ประกอบเลเยอร์ body + hair ใน cell 48×64 (anchor 24, 58) และระบบ caching
- เพิ่ม gender ('male' | 'female') ใน `Appearance` (`art.ts`, `packages/shared/src/net/protocol.ts`, `state/store.ts`) พร้อมระบบ migration เซฟเดิมไม่ให้พัง
- หน้าสร้างตัวละคร (`ui/creator.ts`): เพิ่มปุ่มเลือกเพศ ชาย/หญิง, วนทรงผมเฉพาะเพศที่เลือกพร้อมชื่อไทยจาก manifest, และ live preview หมุน 4 ทิศทาง
- Feature flag `USE_AVATAR_PACK` ควบคุมการเปิดใช้ โดยเก็บระบบ procedural 16×24 เดิมเป็น fallback
**แก้ไข / เปลี่ยน**
- `WorldScene.ts`: ปรับสเกลสไปรต์ตัวละคร (1.6), สเกลมอนสเตอร์ (~32–48 px, บอส ~56 px), จุด origin (0.5, 58/64), แอนิเมชันเดิน 4 เฟรม, และการกลับด้านซ้ายขวาตามทิศทาง
- `remotePlayers.ts`: รองรับ origin และสเกลใหม่สำหรับผู้เล่นคนอื่นในโหมด avatar pack
- `BattleScene.ts`: ปรับจุดยืนและสเกลของตัวละครผู้เล่น (×0.55) และมอนสเตอร์ (~32–48 px, บอส ~64 px) ในสนามประลองให้ตรงกับ baseline ของกันและกัน
**ไฟล์หลักที่แตะ:** `apps/game/src/game/avatar.ts`, `apps/game/src/game/art.ts`, `apps/game/src/ui/creator.ts`, `apps/game/src/scenes/WorldScene.ts`, `apps/game/src/scenes/remotePlayers.ts`, `apps/game/src/scenes/BattleScene.ts`, `apps/game/src/state/store.ts`, `packages/shared/src/net/protocol.ts`, `apps/game/src/style.css`
**ทดสอบ:** npm test (58 ผ่าน) · typecheck ผ่าน · build ผ่าน (Vite) · ตรวจสอบไฟล์อ้างอิงใน manifest ทั้งหมด 115 ไฟล์ครบถ้วน
**ค้าง / ข้อควรรู้:** avatar pack ชุดนี้เป็นภาพ prototype placeholder ยังไม่มีชุดเสื้อผ้าและอุปกรณ์สวมใส่ รวมเข้า `main` แล้ว

## 2026-09-22 — ตั้งกฎทีม + เอกสารส่งต่อ + ขึ้น GitHub (Nong + Claude)
**เพิ่ม**
- `CHANGELOG.md` (ไฟล์นี้), `docs/ROADMAP.md` (สถานะ + งานถัดไป + เรื่องที่ต้องตัดสินใจ)
- กฎการทำงานของทีมใน `CLAUDE.md` — ทุก session ต้องอ่านก่อน/บันทึกหลังทำ
- `README.md` เขียนใหม่เป็นคู่มือติดตั้งและรันทุกโหมด + แก้ปัญหาที่เจอบ่อย
**ไฟล์หลักที่แตะ:** `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, `.gitignore`
**ทดสอบ:** npm test (58 ผ่าน) · typecheck ผ่าน
**ค้าง / ข้อควรรู้:** push ขึ้น `github.com/bosocmputer/game_pixcel_walker` branch `main`

## 2026-09-22 — ปาร์ตี้สู้มอนด้วยกัน + สายจูง 200 ม. + ยอมรับก่อนลงดัน
**เพิ่ม**
- ตีมอนบนแผนที่: สมาชิกปาร์ตี้ที่อยู่ใกล้ ≤ 200 ม. และว่าง ถูกดึงเข้าสู้ด้วยอัตโนมัติ (HP มอน × n^0.6, EXP เต็มทุกคน)
- สายจูงปาร์ตี้: ห่างจากสมาชิกทุกคนเกิน 200 ม. → เตือน → หลุดปาร์ตี้หลัง 10 วิ (`rules/party.ts`)
- ดันเจี้ยนต้องกดยอมรับทุกคนภายใน 20 วิ มีคนปฏิเสธ/ไม่ตอบ = ยกเลิก
**แก้ไข / เปลี่ยน**
- โปรโตคอลเปลี่ยนจาก `dungeon:*` เป็น `run:*` (open/prepare/status/cancel/begin) ใช้ร่วมกันทั้งดันเจี้ยนและสู้มอน
**แก้บั๊ก**
- สถานะ busy ของ client ตั้งตอนการต่อสู้เริ่มจริง (`battle:launched`) ไม่ใช่ตอนขอเริ่ม
**ไฟล์หลักที่แตะ:** `apps/server/src/index.ts`, `apps/game/src/game/net.ts`, `apps/game/src/ui/party.ts`, `packages/shared/src/rules/party.ts`, `packages/shared/src/net/protocol.ts`
**ทดสอบ:** npm test (58 ผ่าน) · ทดสอบ 2 แท็บ: ปฏิเสธ/ยอมรับดัน, สู้มอนด้วยกัน, วาร์ปออกนอกระยะแล้วหลุด

## 2026-09-22 — ระบบปาร์ตี้ + ดันเจี้ยน instance + เครื่องมือเดินจำลอง
**เพิ่ม**
- ปาร์ตี้สูงสุด 3 คน (ชวน/รับ/เชิญออก/ออก) ผ่าน presence server
- ดันเจี้ยน 3 แห่ง (`data/dungeons.ts`): ตรอกหมาผี, โกดังพญาก็อบลิน, ปั๊มร้างยามค่ำ — ทุกเครื่องจำลองการต่อสู้เองจาก seed เดียวกัน
- ยาของใครของมัน (`UnitSetup.items`), ของดรอปส่วนตัว (`memberLootSeed`)
- โหมดจำลอง: ความเร็ว 1×–300×, คลิกขวา/กดค้างเพื่อวาร์ป, ปุ่ม 📍 กลับคูเมือง
**แก้ไข / เปลี่ยน**
- สเกล HP บอสตามจำนวนคนแบบ n^0.6 (ไปหลายคนได้เปรียบ)

## 2026-09-22 — ประวัติก่อนมีไฟล์นี้ (สรุปจาก git log)
- วางรากฐาน: MASTER_SPEC, กฎเกม/ข้อมูลใน `packages/shared`
- แผนที่จริง (MapLibre + OpenFreeMap) + สไปรต์ 16-bit, ตัวสร้างตัวละคร, เดิน 4 ทิศ
- มอนสเตอร์บนแผนที่ (EXP จากการตีมอนเท่านั้น), รัศมีสู้ 120 ม., มอนหนาแน่น, Auto Hunt
- ตัดระบบ Walk Session/นับก้าวออก, บล็อกการสู้เมื่อเร็วระดับรถ
- กล้องหมุน/เอียง/ซูมอิสระ
- ระบบต่อสู้ใหม่ Party Auto Turn-Based (แบบ Pockie Ninja) แทน ATB — `docs/COMBAT_SPEC.md`
- Skill Deck Novice 14 สกิล + ชุดสำเร็จรูป 5 แบบ, สนามทดสอบ + หุ่นไม้, MP ใช้จริง
- LAN multiplayer: เห็นผู้เล่นอื่นบนแผนที่ (presence server)
