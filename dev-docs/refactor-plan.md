# Refactor Plan — จุดที่ควรแก้ให้เป็น best practice

ตรวจจากการอ่านโค้ด ณ commit `8bd986b` (2026-10-03) ยังไม่ได้รันระบบ
เรียงตามลำดับที่ควรทำ: P0 ความปลอดภัย → P1 ขอบเขตเล่ม → P2 โครงสร้าง → P3 คุณภาพโค้ด/เครื่องมือ

---

## สถานะ (อัปเดต 2026-10-04)

| ข้อ | สถานะ |
|---|---|
| 1 key ฝังในโค้ด | แก้แล้ว — เอาออกจากโค้ด ค่า default สำหรับ Docker อยู่ใน `docker-compose.yml` (key เดิมยังอยู่ในประวัติ git ถ้าใช้ key นั้นกับ Render/Vercel ควรเปลี่ยน) |
| 2 โหลดโมเดลโดยไม่ login | แก้แล้ว — ต้องส่ง `X-API-Key` หรือเป็นแอดมิน |
| 3 endpoint เก่าใน FastAPI | ลบแล้ว |
| 4 `/predict` รับ path/URL อะไรก็ได้ | แก้แล้ว — path ต้องอยู่ใต้ `STORAGE_PATH` / `MODELS_PATH`, URL รูปรับเฉพาะ host ที่อนุญาต, URL โมเดลต้องเป็น `/api/models/<id>` |
| 6 รูปของผู้ใช้คนอื่น | แก้แล้ว — `/api/images` ตรวจว่าเป็นเจ้าของรูปหรือแอดมิน และตรวจ path ด้วย `path.relative` |
| 7 Docker | แก้แล้ว — `.dockerignore`, เอา `--reload` ออก, web ใช้ `npm ci`; คง `--accept-data-loss` ไว้โดยตั้งใจ (บน MongoDB จัดการแค่ index ไม่ลบเอกสาร ดู architecture.md) |
| 15 เช็คสิทธิ์ซ้ำ | แก้แล้ว — รวมไว้ที่ `lib/auth/guards.ts` ทุกหน้าและทุก route ใช้ชุดเดียวกัน แยก 401 กับ 403 |
| 25 โค้ดที่ไม่ได้ใช้ | ลบแล้ว — ไฟล์ ฟังก์ชัน package และตัวแปร env ที่ไม่มีใครเรียก |
| 27 test | ทำแล้วเฉพาะฟีเจอร์สำคัญ — เว็บ 164 กรณี (Vitest), AI 37 กรณี (pytest) ดู `testing.md` |
| 28 `.gitattributes` | เพิ่มแล้ว |
| 29 CI, prettier, typecheck | ทำแล้ว (2026-10-30) — `.github/workflows/ci.yml`, prettier + `prettier-plugin-tailwindcss`, commit จัดรูปแบบอยู่ใน `.git-blame-ignore-revs` |
| 30 UI | แก้แล้ว (2026-11-01) — toast (sonner) แทน `alert()`, หน้า error/404/loading ภาษาไทย, ถอด `react-icons`, ลบ `console.log` (progress หน้าวิเคราะห์ยังจำลองอยู่) |
| 22, 23 FastAPI | แก้แล้ว (2026-11-01) — แยก routers/schemas/security/services, `logging`, response model, confidence ค่าเดียว (`AI_CONFIDENCE_THRESHOLD`), เทียบ `model.names` กับ `ACNE_CLASSES` ตอนโหลด (ลำดับยัง hard-code) |
| 19 โมเดลใน Bytes ติด 16 MB | แก้แล้ว (2026-11-01) — Docker เก็บใน volume (`MODEL_STORAGE=file` ไม่จำกัด), Vercel ใช้ `modelData` (≤ 4.5 MB เพดาน Vercel), Azure จะใช้ Azure Blob — แยกฐานข้อมูลต่อ environment (`environments.md`) |
| 14 ชั้นโค้ดชื่อสับสน | แก้แล้ว (2026-10-30) — server logic อยู่ `src/server/<feature>.ts` (มี `server-only`), client fetch อยู่ `src/lib/api-client/` |
| 16 โค้ดซ้ำ | แก้แล้ว — ประวัติเหลือ `getHistory` / `deleteHistories`, ลบโมเดลเดี่ยว/กลุ่มใช้ `removeInactiveModels` ร่วมกัน, ลบผู้ใช้และลบประวัติใช้ `deleteAnalysesWhere` ร่วมกัน |
| 17 ดึงข้อมูลมากรองใน memory | แก้บางส่วน — ไม่ดึง `modelData` ตอนวิเคราะห์; ประวัติยังกรองใน memory เพราะตาราง ag-grid แบ่งหน้าฝั่ง client (ต้องเปลี่ยน UI เป็นแบ่งหน้าฝั่ง server ก่อน) |
| 18 REST + zod | แก้แล้ว — `POST /api/models`, `PATCH /api/models/[id]`, `POST /api/models/[id]/activate`; body ทุก route ตรวจด้วย zod; `HttpError` ให้ status ถูกต้อง (400/404/409) |
| 20 transaction / ลบตัว active | แก้แล้ว |
| 21 รูปค้างเมื่อ FastAPI ล้ม | แก้แล้ว — ลบรูปใน `catch` ของ `POST /api/analyze` |
| 26 TypeScript หลวม | แก้แล้ว — `noImplicitAny` + `no-explicit-any` เป็น error, `any` เหลือ 0 |
| ใหม่ | แก้แล้ว — หน้า `/admin/users` เคยส่ง hash รหัสผ่านของผู้ใช้ทุกคนไปที่เบราว์เซอร์ (`include` แทน `select`) |
| ใหม่ | แก้แล้ว (2026-11-01) — server ไม่ลบบัญชี ADMIN: ลบเดี่ยวตอบ 403, ลบกลุ่มข้ามไป |
