# AcneAI — System Context

## How to Run (การรันโปรเจกต์แบบ Local)

**1. รันฝั่ง AI (FastAPI)**

```bash
cd apps\ai
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**2. รันฝั่ง Web (Next.js)**

```bash
cd apps\web
npm run dev
```

## Stack

- **Web**: Next.js 16 (App Router, Server Actions)
- **AI Service**: FastAPI + YOLO (Ultralytics)
- **Database**: MongoDB (Prisma ORM) — Atlas (hosted/dev) / Container (docker)
- **Image Storage**: Local disk (dev/docker) | Cloudinary (hosted)
- **Model Storage**: MongoDB Binary (`modelData: Bytes`) — ทุก environment

---

## Environment

|            | **Dev**                 | **Docker**                   | **Hosted**           |
| ---------- | ----------------------- | ---------------------------- | -------------------- |
| รัน        | `npm run dev`           | `docker-compose up`          | Vercel + HuggingFace |
| DB         | MongoDB Atlas           | MongoDB container (override) | MongoDB Atlas        |
| รูปภาพ     | Local disk              | Local disk (volume mount)    | Cloudinary           |
| โมเดล AI   | **MongoDB Binary**      | **MongoDB Binary**           | **MongoDB Binary**   |
| AI URL     | `http://localhost:8000` | `http://ai:8000` (override)  | HuggingFace URL      |
| Switch key | `APP_ENV=dev`           | `APP_ENV=docker`             | `APP_ENV=hosted`     |

> **Image provider switch**: `image-provider.ts` → `if APP_ENV === "hosted"` → Cloudinary, else Local disk
> **Model provider**: เก็บ MongoDB Binary เสมอ ทุก env (ไม่มี switch แล้ว)

---

## Flow: สแกนสิว (ทุก env)

```
1. ผู้ใช้อัปโหลดรูป
       ↓
2. Next.js รับรูป → เซฟตาม env (Local / Cloudinary)
       ↓
3. Next.js ดึง Active Model จาก MongoDB
       ↓
4. Next.js POST /predict ไปที่ FastAPI พร้อม:
   - image_url_or_path = URL (Cloudinary) หรือ absolute path (local)
   - model_url_or_path = http://<app>/api/models/{id}  ← เสมอ
       ↓
5. FastAPI รับ:
   - รูป: download จาก URL หรืออ่านจาก path ตรงๆ
   - โมเดล: download จาก /api/models/{id} → Cache ไว้ที่ /app/models/
       ↓
6. FastAPI โหลด YOLO → รัน predict → return JSON
       ↓
7. Next.js รับผล → คำนวณ Severity → บันทึก DB → แสดงผล
```

---

## Flow: อัปโหลดโมเดล (Admin)

```
Admin เลือกไฟล์ .pt → กด Upload
       ↓
Next.js รับไฟล์ → อ่านเป็น Uint8Array
       ↓
บันทึกลง MongoDB: AiModel { modelData: <Binary>, provider: "mongodb" }
       ↓
ใช้งานได้ทันที (ไม่มีไฟล์บนดิสก์เลย)
```

---

## Flow: FastAPI Model Cache

```
FastAPI รับ model_url_or_path = "http://localhost:3000/api/models/abc123"
       ↓
เช็คว่ามีไฟล์ใน /app/models/<filename> ไหม?
  - มีแล้ว (Cache hit)  → โหลดเลย
  - ไม่มี (Cache miss) → Download จาก URL → เซฟที่ /app/models/
       ↓
YOLO โหลดโมเดล → predict
```

> `/app/models/` ในฝั่ง FastAPI = **Cache เท่านั้น** ไม่ใช่ source of truth
> Source of truth = MongoDB `modelData` field
> โฟลเดอร์นี้จำเป็นต้องมีเพื่อให้ FastAPI เขียน cache ได้

---

## โครงสร้างไฟล์สำคัญ

```
apps/
├── web/
│   ├── src/lib/storage/
│   │   ├── image-provider.ts   ← switch Local/Cloudinary ตาม APP_ENV
│   │   └── model-provider.ts   ← MongoDB Binary เสมอ (ไม่มี switch)
│   ├── src/app/actions/
│   │   ├── analyze-actions.ts  ← flow สแกนสิว
│   │   └── model-actions.ts    ← upload/delete โมเดล
│   └── src/app/api/models/[id]/
│       └── route.ts            ← FastAPI ดึงโมเดลจากนี่
├── ai/
│   ├── app/main.py             ← /predict endpoint
│   ├── app/config.py           ← MODELS_PATH (cache dir)
│   └── models/                 ← FastAPI cache (ต้องมี แต่ไม่ใช่ source of truth)
└── images/                     ← รูปภาพ shared volume (dev/docker)
```

---

## API Endpoints สำคัญ

| Endpoint                       | ใครเรียก | ทำอะไร                            |
| ------------------------------ | -------- | --------------------------------- |
| `POST /predict`                | Next.js  | ส่งรูป+โมเดล → YOLO → return JSON |
| `GET /api/models/[id]`         | FastAPI  | ดึง binary โมเดลจาก MongoDB       |
| `GET /api/images/[...path]`    | Browser  | ดึงรูปจาก local disk              |
| `POST /api/auth/[...nextauth]` | Browser  | Auth.js session                   |

---

## กฎการประเมินความรุนแรงของสิว (Severity Rules)

การคำนวณและประเมินระดับความรุนแรง อ้างอิงตามแนวทางสถาบันโรคผิวหนังแห่งสหรัฐอเมริกา (AAD) และ ALADIN

**ไฟล์ที่เกี่ยวข้อง:**

- `apps/web/src/app/actions/analyze-actions.ts` (Logic คำนวณ)
- `apps/web/src/types/analyze.ts` (ชื่อภาษาไทยและข้อความคำแนะนำ)
- `apps/web/src/components/analyze/analysis-result.tsx` (UI แสดงผล)

**การจัดกลุ่มสิว:**

- **ไม่อักเสบ (Non-inflammatory):** สิวหัวดำ (blackhead), สิวหัวขาว (whitehead)
- **อักเสบระดับตื้น (Shallow inflammatory):** สิวตุ่มแดง (papule), สิวหัวหนอง (pustule)
- **อักเสบระดับลึก (Deep inflammatory):** สิวก้อนแข็ง (nodule), สิวซีสต์ (cyst)

**เกณฑ์การประเมินและคำแนะนำ:**

1. **SEVERE (รุนแรง):**
   - **เกณฑ์:** อักเสบตื้น > 20 จุด **หรือ** อักเสบลึก ≥ 1 จุด
   - **คำแนะนำ:** แจ้งเตือนถึงความเสี่ยงขั้นสูงสุดในการเกิดแผลเป็นแบบหลุม (Acne Scars) เน้นย้ำให้หลีกเลี่ยงการบีบ/กดสิวอย่างเด็ดขาด และแนะนำให้เข้าพบแพทย์ผิวหนัง (Dermatologist) โดยทันที

2. **MODERATE (ปานกลาง):**
   - **เกณฑ์:** ไม่อักเสบ > 20 จุด **หรือ** อักเสบตื้น 6 ถึง 20 จุด
   - **คำแนะนำ:** แนะนำให้หลีกเลี่ยงการสครับผิวและเครื่องสำอางที่ก่อให้อุดตัน ปรึกษาเภสัชกรเพื่อใช้ยาทาต้านแบคทีเรีย/ลดการอักเสบ (เช่น Benzoyl Peroxide หรือ Topical Retinoids)

3. **MILD (เล็กน้อย):**
   - **เกณฑ์:** ไม่อักเสบ ≤ 20 จุด **และ** อักเสบตื้น ≤ 5 จุด
   - **คำแนะนำ:** แนะนำการทำความสะอาดผิวหน้าอย่างถูกวิธีด้วยผลิตภัณฑ์สูตรอ่อนโยน และพิจารณาใช้ผลิตภัณฑ์เวชสำอาง (OTC) ที่มีกรดซาลิไซลิก (Salicylic Acid)

---

## Technical Notes (ข้อควรระวังสำหรับนักพัฒนา)

**1. การบันทึกไฟล์ Binary ลง MongoDB (Prisma)**
- การบันทึกไฟล์ (เช่น โมเดล `.pt`) ลงในฟิลด์ `Bytes` ของ Prisma/MongoDB **ต้องแปลงไฟล์เป็น `Buffer` เสมอ** (`Buffer.from(await file.arrayBuffer())`)
- **ห้าม**ใช้ `Uint8Array` หรือ ArrayBuffer ตรงๆ เพราะใน Next.js Server Actions มันจะสูญหายและถูกบันทึกเป็นค่า `null` ในฐานข้อมูล ซึ่งจะทำให้ FastAPI ดาวน์โหลดไฟล์ไปแล้วได้ไฟล์ 0 bytes (ไฟล์พัง) จนเกิด Error ในการโหลด YOLO (`ne task for your model...`)
