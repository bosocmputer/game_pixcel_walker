# ก้าวข้ามมิติ: Pixel Walker

เกม RPG 8-bit ที่ใช้การเดินในโลกจริง (เชียงใหม่) — เล่นบนเบราว์เซอร์มือถือ

- ดีไซน์ทั้งหมด: [docs/MASTER_SPEC.md](docs/MASTER_SPEC.md)
- คู่มือสำหรับ Claude: [CLAUDE.md](CLAUDE.md)

## เริ่มใช้งาน

```bash
npm install
npm run dev
```

เปิด http://localhost:5173 — บนคอมพิวเตอร์ GPS จะเข้าโหมดจำลองอัตโนมัติ ใช้ **WASD / ลูกศร** เดิน
(กด Shift ค้างเพื่อวิ่งเร็ว — เร็วเกิน 20 กม./ชม. จะไม่นับก้าว) หรือใช้จอยสติ๊กบนจอ

ทดสอบบนมือถือในวง Wi-Fi เดียวกัน: เปิด `http://<IP เครื่องคอม>:5173`
(GPS จริงต้องใช้ HTTPS — ใช้ตอน deploy แล้ว หรือใช้ tunnel เช่น `npx localtunnel --port 5173`)

## คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm test` | เทสต์กฎเกม + จำลองสมดุล (balance) |
| `npm run typecheck` | ตรวจ TypeScript |
| `npm run build` | build เกมไว้ที่ `apps/game/dist` |
| `npm run map:build` | ดึง OpenStreetMap เชียงใหม่ → แผนที่ 8-bit ใหม่ |

## Deploy (ฟรี)

`apps/game/dist` เป็น static site ล้วน — ลากไปวางที่ Netlify Drop หรือเชื่อม GitHub กับ Vercel/Netlify
โดยตั้ง build command `npm run build` และ output `apps/game/dist`

## เครดิตข้อมูล

ข้อมูลแผนที่ © OpenStreetMap contributors, ใช้ภายใต้สัญญาอนุญาต ODbL
