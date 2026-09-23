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
