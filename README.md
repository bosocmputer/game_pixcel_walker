# ก้าวข้ามมิติ: Pixel Walker

เกม RPG แนว location-based บนเบราว์เซอร์ (คอม + มือถือ): แผนที่โลกจริงเป็นพื้นหลัง ตัวละคร/มอนสเตอร์เป็นสไปรต์ 16-bit
เดินจริงไปหามอน ต่อสู้แบบ Auto Turn-Based (สไตล์ Pockie Ninja) จัด Skill Deck เอง รวมปาร์ตี้ลงดันเจี้ยนกับเพื่อนที่อยู่ใกล้ ๆ
เริ่มชุมชนผู้เล่นที่เชียงใหม่

## 📚 อ่านอะไรก่อน (สำหรับคนและ AI agent)

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **กฎการทำงานของทีม** + โครงสร้างโค้ด + กฎการเขียนโค้ด (Claude Code อ่านไฟล์นี้อัตโนมัติ) |
| [docs/ROADMAP.md](docs/ROADMAP.md) | ตอนนี้ทำถึงไหน, งานถัดไป, เรื่องที่รอตัดสินใจ — ไว้คุยกันในทีม |
| [CHANGELOG.md](CHANGELOG.md) | ประวัติ: แต่ละครั้งทำอะไร เพิ่มอะไร แก้อะไร |
| [docs/MASTER_SPEC.md](docs/MASTER_SPEC.md) | ดีไซน์เกมทั้งหมด (source of truth) |
| [docs/COMBAT_SPEC.md](docs/COMBAT_SPEC.md) | ระบบต่อสู้แบบละเอียด |

> **สั่ง agent เริ่มงาน:** "อ่าน README.md, CLAUDE.md, docs/ROADMAP.md และ CHANGELOG.md 3 รายการล่าสุด แล้วสรุปสถานะโปรเจกต์ให้ฟังก่อนเริ่มงาน"

---

## 🛠️ ติดตั้งครั้งแรก

**ต้องมี:** [Node.js](https://nodejs.org) **22 ขึ้นไป** (ทีมใช้ 22.14) · npm 10+ · Git · เบราว์เซอร์ Chrome/Edge

```bash
git clone https://github.com/bosocmputer/game_pixcel_walker.git
cd game_pixcel_walker
npm install
```

เช็กว่าทุกอย่างพร้อม:

```bash
npm test
npm run typecheck
```

ควรเห็นเทสต์ผ่านทั้งหมดและ typecheck ไม่มี error

---

## ▶️ วิธีรัน

### 1) เล่นคนเดียวบนคอม (เร็วสุด)

```bash
npm run dev
```

เปิด http://localhost:5173 → สร้างตัวละคร → คอมไม่มี GPS จะเข้า **โหมดจำลอง** อัตโนมัติ
(โหมดนี้ไม่มีผู้เล่นอื่น/ปาร์ตี้ เพราะไม่ได้เปิดเซิร์ฟเวอร์)

### 2) เล่นหลายคนบนคอมเครื่องเดียว (เกม + เซิร์ฟเวอร์)

```bash
npm run dev:all
```

- รัน presence server (พอร์ต 8787) + เกม (พอร์ต 5173) พร้อมกัน
- จำลองผู้เล่นคนที่ 2: เปิดอีกแท็บเป็น http://localhost:5173/?player=2 (ใช้ตัวละครเดียวกันแต่เป็นผู้เล่นคนละคน)

### 3) เล่นกับมือถือ/คอมเครื่องอื่นใน Wi-Fi เดียวกัน

```bash
npm run dev:lan
```

- เหมือนข้อ 2 แต่เปิดเป็น **HTTPS** (มือถือต้องใช้ HTTPS ถึงจะให้ GPS)
- หา IP คอม: Windows `ipconfig` (ดู IPv4 ของ Wi-Fi) · Mac `ipconfig getifaddr en0`
- เครื่องอื่นเปิด `https://<IP คอม>:5173` เช่น `https://192.168.1.111:5173`
- เบราว์เซอร์จะเตือนใบรับรอง → กด "ขั้นสูง" → "ดำเนินการต่อ" (เป็นใบรับรองทดสอบที่สร้างในเครื่องเอง ปลอดภัย)
- ครั้งแรก Windows ถามสิทธิ์ไฟร์วอลล์ของ Node.js → อนุญาต **เครือข่ายส่วนตัว (Private)**

### 4) รันแยกทีละตัว (ไว้ดู log)

```bash
npm run server
```

```bash
npm run dev
```

### คำสั่งทั้งหมด

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | เกมอย่างเดียว http://localhost:5173 |
| `npm run server` | presence server อย่างเดียว ws://localhost:8787 |
| `npm run dev:all` | เกม + เซิร์ฟเวอร์ (HTTP, คอมเครื่องเดียว) |
| `npm run dev:lan` | เกม + เซิร์ฟเวอร์ (HTTPS, มือถือใน Wi-Fi) |
| `npm test` | เทสต์กฎเกม + จำลองสมดุล (Monte-Carlo) ใน `packages/shared` |
| `npm run typecheck` | ตรวจ TypeScript ทั้ง shared / game / server |
| `npm run build` | build เกมเป็น static site ที่ `apps/game/dist` |

---

## 🎮 เครื่องมือทดสอบในเกม (ช่วงพัฒนาเท่านั้น)

| เครื่องมือ | อยู่ที่ไหน |
|---|---|
| เดินในโหมดจำลอง | ปุ่ม **WASD / ลูกศร** หรือจอยสติ๊กบนจอ |
| ปรับความเร็วเดิน 1×–300× | ปุ่ม 🏃 ขวาล่าง |
| วาร์ปกลับคูเมืองเชียงใหม่ | ปุ่ม 📍 ข้างปุ่ม 🏃 |
| วาร์ปไปจุดไหนก็ได้ | **คลิกขวา** บนแผนที่ (มือถือ Android: กดค้าง) |
| สนามทดสอบการต่อสู้ + หุ่นไม้ | ⚙️ ตั้งค่า → 🧪 สนามทดสอบ |
| ปาร์ตี้ / ดันเจี้ยน | ปุ่ม 👥 แถบล่าง (ต้องรัน `dev:all` หรือ `dev:lan`) |
| ลบตัวละคร | ⚙️ ตั้งค่า → ลบตัวละคร |

⚠️ โหมดจำลองกับสนามทดสอบต้องปิดก่อนเปิดเกมจริง (ดู [ROADMAP](docs/ROADMAP.md))

---

## 🧯 แก้ปัญหาที่เจอบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `EADDRINUSE ... 8787` หรือ `5173` | มีเซิร์ฟเวอร์ตัวเก่ารันค้างอยู่ ปิดหน้าต่างเทอร์มินัลเก่า หรือ Windows: `netstat -ano \| findstr 8787` แล้ว `taskkill /PID <pid> /F` |
| ป้ายขวาบนขึ้น "⚪ ออฟไลน์" | ยังไม่ได้รันเซิร์ฟเวอร์ → ใช้ `npm run dev:all` แทน `npm run dev` |
| มือถือเข้า `https://<IP>:5173` ไม่ได้ | ต้องอยู่ Wi-Fi เดียวกัน · Windows ตั้งเครือข่าย Wi-Fi เป็น **Private** (Settings → Network → Wi-Fi → Network profile) · อนุญาต Node.js ในไฟร์วอลล์ |
| มือถือไม่มี GPS | ต้องเปิดผ่าน `https://` (ใช้ `dev:lan`) และกดอนุญาตตำแหน่ง |
| เห็นผู้เล่นอื่นไม่ได้ | ระบบแสดงเฉพาะคนในระยะ 2 กม. → กด 📍 วาร์ปมาคูเมืองทั้งสองเครื่อง |
| แก้โค้ดเซิร์ฟเวอร์แล้วไม่เปลี่ยน | เซิร์ฟเวอร์ไม่ reload เอง → ปิดแล้วรันใหม่ แล้วรีเฟรชเกมทุกเครื่อง |
| ตัวละครหายหลังล้างเบราว์เซอร์ | ตอนนี้เซฟอยู่ใน localStorage ของเบราว์เซอร์ (ยังไม่มีบัญชีออนไลน์) |

---

## 🗂️ โครงสร้างโปรเจกต์ (ย่อ)

```
packages/shared   กฎเกม + ข้อมูล (TypeScript ล้วน ใช้ทั้ง client และ server) + เทสต์
apps/game         ตัวเกม Phaser 3 + Vite + MapLibre
apps/server       presence server (Node + WebSocket): ผู้เล่นใกล้ ๆ, ปาร์ตี้, ดันเจี้ยน
tools/            เครื่องมือเสริม (osm baker เก่า, art preview)
docs/             สเปก + roadmap
```

รายละเอียดเต็มดูที่ [CLAUDE.md](CLAUDE.md)

## Deploy (ฟรี) — ยังไม่ได้ทำจริง

`apps/game/dist` เป็น static site ล้วน วางบน Netlify/Vercel ได้ (build command `npm run build`, output `apps/game/dist`)
ส่วน presence server ต้องใช้โฮสต์ที่รัน Node + WebSocket ได้ ดูแผนใน [ROADMAP](docs/ROADMAP.md)

## เครดิตข้อมูล

แผนที่ © OpenStreetMap contributors (ODbL) · ไทล์จาก OpenFreeMap / OpenMapTiles
