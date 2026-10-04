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
| modelData | Bytes? | ไฟล์ `.pt` ทั้งไฟล์ |
| provider | String | ปัจจุบันเป็น `"mongodb"` เสมอ (default ใน schema ยังเป็น `"local"`) |
| filePath | String | เหลือจากดีไซน์เก่า ปัจจุบันเก็บ `""` |
| fileName | String | `<hex>_<ชื่อไฟล์>` |
| sizeMb | Float | |
| isActive | Boolean | ควรมี true ได้ตัวเดียว (บังคับด้วยโค้ด ไม่ใช่ DB) |
| uploadedBy | ObjectId → User | |

ไม่มี field เก็บค่าประเมินโมเดล (Recall, F1, mAP) — ดู scope-traceability ข้อ 1.3.3.3

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
- ลบโมเดล: set `Analysis.modelId = null` → ลบ `AiModel`

## ข้อจำกัดที่ต้องรู้

- เอกสาร BSON ใหญ่สุด 16 MB → โมเดลที่ใหญ่กว่านี้เก็บใน `modelData` ไม่ได้ (UI อนุญาตถึง 100 MB)
- ไม่มี index เพิ่มเติมบน `Analysis.userId`, `Analysis.createdAt`
- `counts`/`detections` เป็น Json จึง query/aggregate ใน DB ไม่ได้ตรง ๆ ปัจจุบันคำนวณใน JS
