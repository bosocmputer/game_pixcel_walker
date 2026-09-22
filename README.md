# ก้าวข้ามมิติ: Pixel Walker

เกม RPG 8-bit ที่ใช้การเดินในโลกจริง (เชียงใหม่) — เล่นบนเบราว์เซอร์มือถือ

- ดีไซน์ทั้งหมด: [docs/MASTER_SPEC.md](docs/MASTER_SPEC.md)
- คู่มือสำหรับ Claude: [CLAUDE.md](CLAUDE.md)

## เริ่มใช้งาน

```bash
npm install
npm run dev
```

เปิด http://localhost:5173 — บนคอมพิวเตอร์ GPS จะเข้าโหมดจำลองอัตโนมัติ ใช้ **WASD / ลูกศร** หรือจอยสติ๊กบนจอเดิน
ปรับความเร็วโหมดจำลองได้ที่ปุ่ม 🏃 (ทดสอบเท่านั้น) · มือถือต้องใช้ HTTPS ถึงจะได้ GPS จริง — ดูหัวข้อถัดไป

## เล่นหลายเครื่อง (วง Wi-Fi เดียวกัน)

```bash
npm run dev:lan
```

- รัน presence server + เกมแบบ HTTPS พร้อมกัน
- เปิดบนมือถือ/เครื่องอื่น: `https://<IP เครื่องคอม>:5173` (ดู IP ด้วย `ipconfig`)
- มือถือจะเตือนเรื่องใบรับรอง → กด "ขั้นสูง/ดำเนินการต่อ" (เป็นใบรับรองทดสอบในเครื่องคุณเอง) → อนุญาตตำแหน่ง
- ครั้งแรก Windows อาจถามสิทธิ์ไฟร์วอลล์ของ Node.js → อนุญาตเฉพาะ "เครือข่ายส่วนตัว"
- ทดสอบ 2 ผู้เล่นในคอมเครื่องเดียว: เปิดแท็บที่สองเป็น `…/?player=2`
- บนคอมอย่างเดียว (ไม่ต้อง HTTPS): `npm run dev:all`

## คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm test` | เทสต์กฎเกม + จำลองสมดุล (balance) |
| `npm run typecheck` | ตรวจ TypeScript |
| `npm run build` | build เกมไว้ที่ `apps/game/dist` |
| `npm run dev:all` / `npm run dev:lan` | เกม + presence server (lan = HTTPS สำหรับมือถือ) |

## Deploy (ฟรี)

`apps/game/dist` เป็น static site ล้วน — ลากไปวางที่ Netlify Drop หรือเชื่อม GitHub กับ Vercel/Netlify
โดยตั้ง build command `npm run build` และ output `apps/game/dist`

## เครดิตข้อมูล

ข้อมูลแผนที่ © OpenStreetMap contributors, ใช้ภายใต้สัญญาอนุญาต ODbL
