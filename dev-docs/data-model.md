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
| modelData | Bytes? | ไฟล์ `.pt` ทั้งไฟล์ (เฉพาะ provider `"mongodb"` แบบเก่า/seed) |
| provider | String | `"chunks"` = หั่นชิ้นใน `AiModelChunk` (แบบปัจจุบัน), `"mongodb"` = `modelData`, `"file"` = โฟลเดอร์ `MODEL_STORAGE_PATH` (สองแบบหลังเป็นของเก่า; default ใน schema ยังเป็น `"local"` ที่ไม่ได้ใช้แล้ว) |
| sizeBytes, chunkCount | Int? | ขนาดจริงและจำนวนชิ้น (provider `"chunks"`) |
| uploadComplete | Boolean? | `false` = ยังส่งชิ้นไม่ครบ ตั้งเป็นโมเดลหลักไม่ได้, `null` = โมเดลแบบเก่า ถือว่าครบ |
| filePath | String | provider `"file"` = ชื่อไฟล์ในโฟลเดอร์, `"mongodb"` = `""` |
| fileName | String | `<hex>_<ชื่อไฟล์>` |
| sizeMb | Float | |
| isActive | Boolean | ควรมี true ได้ตัวเดียว (บังคับด้วยโค้ด ไม่ใช่ DB) |
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
| createdAt | DateTime | |

## ลำดับการลบ (สำคัญ)

- ลบประวัติ: ลบไฟล์รูป → ลบ `Image` → `Analysis` หายตาม cascade
- ลบผู้ใช้: ลบไฟล์รูปทั้งหมด → ลบ `Image` ทั้งหมด → ลบ `User`
- ลบโมเดล: set `Analysis.modelId = null` → ลบ `AiModelChunk` ของโมเดล → ลบ `AiModel` (ใน transaction เดียว)

### AiModelChunk
| field | type | หมายเหตุ |
|---|---|---|
| modelId | ObjectId → AiModel | onDelete Cascade |
| index | Int | 0..chunkCount-1, unique คู่กับ modelId |
| data | Bytes | ไม่เกิน 4 MB ต่อชิ้น (ต้องส่ง `Buffer`) |

> **หลังแก้ schema ต้องรัน `npx prisma db push` กับฐานข้อมูลจริง (Atlas) เอง** — Docker รันให้ตอน container เริ่ม แต่ Vercel build รันแค่ `prisma generate` ถ้าไม่ push จะไม่มี unique index `(modelId, index)` และการส่งชิ้นซ้ำ (ลองใหม่) อาจได้ชิ้นซ้อนกัน

## ข้อจำกัดที่ต้องรู้

- เอกสาร BSON ใหญ่สุด 16 MB → ไฟล์โมเดลจึงหั่นเป็นชิ้น 4 MB ใน `AiModelChunk` (`modelData` แบบเก่ารับได้ไม่เกิน 15 MB)
- Atlas ฟรีมีพื้นที่รวม 512 MB — โมเดลใหญ่กินพื้นที่เร็ว
- ไม่มี index เพิ่มเติมบน `Analysis.userId`, `Analysis.createdAt`
- `counts`/`detections` เป็น Json จึง query/aggregate ใน DB ไม่ได้ตรง ๆ ปัจจุบันคำนวณใน JS
