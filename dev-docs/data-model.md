# Data Model (`apps/web/prisma/schema.prisma`)

MongoDB + Prisma 6 · id ทุกตัวเป็น `ObjectId` · ไม่มี migration (ใช้ `prisma db push`)

## ความสัมพันธ์

```
User 1 ──── * Account            (Auth.js, cascade)
User 1 ──── * Session            (Auth.js, cascade — ไม่ถูกใช้จริงเพราะ session เป็น JWT)
User 1 ──── * Analysis           (cascade)
User 1 ──── * AiModel            (uploadedBy — ไม่ได้ระบุ onDelete; default ของ Prisma คือ Restrict → ลบ user ที่เคยอัปโหลดโมเดลน่าจะ error ยังไม่ได้ทดสอบ)
AiModel 1 ── * Analysis          (modelId nullable, onDelete: SetNull)
Image 1 ──── 1 Analysis          (Analysis.imageId unique, ลบ Image → cascade ลบ Analysis)
VerificationToken                (Auth.js)
```

## Models

### User
`id, name?, email (unique), emailVerified?, image?, password? (null = Google), role (USER|ADMIN, default USER), createdAt, updatedAt`

### AiModel
| field | type | หมายเหตุ |
|---|---|---|
| name, version, description? | String | |
| modelData | Bytes? | ไฟล์ `.pt` ทั้งไฟล์ (provider `"mongodb"` ≤ 15 MB) |
| provider | String | `"file"` = โฟลเดอร์ `MODEL_STORAGE_PATH` ของเครื่องที่อัปโหลด, `"mongodb"` = `modelData` (เลือกด้วย `MODEL_STORAGE` ดู `environments.md`; default ใน schema ยังเป็น `"local"` ที่ไม่ได้ใช้แล้ว; `"chunks"` เป็นแบบที่เลิกใช้ ล้างด้วย `npm run db:cleanup`) |
| filePath | String | provider `"file"` = ชื่อไฟล์ในโฟลเดอร์, `"mongodb"` = `""` |
| fileName | String | `<hex>_<ชื่อไฟล์>` |
| sizeMb | Float | |
| isActive | Boolean | ควรมี true ได้ตัวเดียว (บังคับด้วยโค้ด ไม่ใช่ DB) |
| useTta | Boolean | default false — วิเคราะห์แบบ Test-Time Augmentation (แอดมินเปิด/ปิดในหน้าแก้ไขโมเดล) |
| confidence | Float | default 0.2 — ความมั่นใจขั้นต่ำของกรอบสิว (0.05–0.95) ตั้งในหน้าแก้ไขโมเดล |
| uploadedBy | ObjectId → User | |

ค่าประเมินโมเดล (ข้อ 1.3.3.3): `mAP50`, `precision`, `recall`, `f1Score`, `accuracy` — `Float?` เก็บเป็นร้อยละ 0–100 แอดมินกรอกในหน้าแก้ไขโมเดล (`parseModelMetrics` ตรวจช่วงค่า) ไม่ได้อ่านจากไฟล์ `.pt`

### Image
`id, fileName, url?, provider ("local" | "vercel-blob"), createdAt`

### Analysis
| field | type | หมายเหตุ |
|---|---|---|
| userId | ObjectId → User | |
| modelId | ObjectId? → AiModel | null ถ้าโมเดลถูกลบ |
| imageId | ObjectId (unique) → Image | |
| detections | Json | `[{type, confidence, bbox:{x1,y1,x2,y2}}]` |
| counts | Json | `{blackhead, whitehead, papule, pustule, nodule, cyst}` |
| total | Int | |
| severity | enum Severity | MILD / MODERATE / SEVERE |
| usedTta | Boolean | default false — ผลครั้งนี้ใช้ TTA หรือไม่ (คัดลอกจาก `AiModel.useTta` ตอนวิเคราะห์) |
| confidence | Float? | ความมั่นใจขั้นต่ำที่ใช้ครั้งนี้ (คัดลอกจาก `AiModel.confidence`) ผลเก่า = null |
| createdAt | DateTime | |

## ลำดับการลบ (สำคัญ)

- ลบประวัติ: ลบไฟล์รูป → ลบ `Image` → `Analysis` หายตาม cascade
- ลบผู้ใช้: ลบไฟล์รูปทั้งหมด → ลบ `Image` ทั้งหมด → ลบ `User`
- ลบโมเดล: set `Analysis.modelId = null` → ลบ `AiModel` (ใน transaction เดียว) แล้วลบไฟล์ (`file`) ถ้าเครื่องนี้มีโฟลเดอร์

> **ช่องใหม่ที่เป็น required + `@default`:** MongoDB ไม่เติมค่าให้ document เดิม ต้องเพิ่มใน `BACKFILL` ของ `prisma/seed.mjs` (Docker รันตอนเริ่ม, Atlas รัน `npm run db:seed`)
>
> **หลังแก้ schema ต้องรัน `npx prisma db push` กับฐานข้อมูลของทุก environment** — Docker ทำให้ตอน container เริ่ม แต่ Atlas ต้องรันเอง (Vercel build รันแค่ `prisma generate`)

## ข้อจำกัดที่ต้องรู้

- เอกสาร BSON ใหญ่สุด 16 MB → `modelData` รับได้ไม่เกิน 15 MB โมเดลใหญ่ต้องใช้ `MODEL_STORAGE=file` (Docker) หรือที่เก็บบนคลาวด์ (Azure Blob — กำลังทำ)
- Atlas ฟรีมีพื้นที่รวม 512 MB
- ไม่มี index เพิ่มเติมบน `Analysis.userId`, `Analysis.createdAt`
- `counts`/`detections` เป็น Json จึง query/aggregate ใน DB ไม่ได้ตรง ๆ ปัจจุบันคำนวณใน JS
