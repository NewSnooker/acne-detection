# System Context (บันทึกระบบฉบับเดิม)

> **ล้าสมัย — อย่าใช้อ้างอิงพฤติกรรมปัจจุบัน** ไฟล์นี้บรรยายระบบช่วงก่อน 2026-10 (เช่น เก็บโมเดลใน MongoDB ทุกระบบ, เลือกที่เก็บด้วย `APP_ENV`) ปัจจุบันดู `architecture.md`, `environments.md` และ `azure-deploy.md`

> ไฟล์นี้คือเนื้อหา README ฉบับเดิมของโปรเจค เก็บไว้อ้างอิง โดยเฉพาะเรื่องการ deploy บน Vercel + Render
> ข้อมูลที่อัปเดตตามโค้ดล่าสุดอยู่ใน `architecture.md`, `api-reference.md` และไฟล์อื่นในโฟลเดอร์นี้
> วิธีเริ่มใช้งานด้วย Docker ย้ายไปที่ `manual/01-getting-started.md`

---

## How to Run (การรันโปรเจกต์แบบ Local ไม่ใช้ Docker)

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

---

## Stack

- **Web**: Next.js 16 (App Router, API Routes, Auth.js)
- **AI Service**: FastAPI + YOLO (Ultralytics)
- **Database**: MongoDB (Prisma ORM) — Atlas (hosted/dev) / Container (docker)
- **Image Storage**: Local disk (dev/docker) | Vercel Blob Storage (hosted)
- **Model Storage**: MongoDB Binary (`modelData: Bytes`) — ทุก environment

---

## Environment

|            | **Dev**                 | **Docker**                   | **Hosted**                    |
| ---------- | ----------------------- | ---------------------------- | ----------------------------- |
| รัน        | `npm run dev`           | `docker-compose up`          | **Vercel (Web) + Render.com (AI)** |
| DB         | MongoDB Atlas           | MongoDB container (override) | MongoDB Atlas                 |
| รูปภาพ     | Local disk              | Local disk (volume mount)    | **Vercel Blob Storage**       |
| โมเดล AI   | **MongoDB Binary**      | **MongoDB Binary**           | **MongoDB Binary**            |
| AI URL     | `http://localhost:8000` | `http://ai:8000` (override)  | `https://<app>.onrender.com`  |
| Switch key | `APP_ENV=dev`           | `APP_ENV=docker`             | `APP_ENV=hosted`              |

> **Image provider switch**: `image-provider.ts` → `if APP_ENV === "hosted"` → Vercel Blob (`@vercel/blob`), else Local disk
> **Model provider**: เก็บ MongoDB Binary เสมอ ทุก env (`modelData: Bytes`)

---

## Architecture: Image Storage

### 1. โหมด Local / Docker (`APP_ENV=dev` หรือ `docker`)
- รูปถูกเซฟลงโฟลเดอร์ Local / Shared Volume (`/apps/images/`)
- Next.js ส่ง **Absolute Path** ให้ FastAPI อ่านไฟล์จากดิสก์โดยตรง (เร็วระดับ 0.01-0.05 วินาที)
- บันทึกใน MongoDB ด้วย `provider: "local"` และ `url: null`
- หน้าประวัติและหน้าเว็บดึงรูปผ่าน `GET /api/images/[...path]`

### 2. โหมด Hosted (`APP_ENV=hosted` บน Vercel + Render.com)
- Next.js อัปโหลดรูปขึ้น **Vercel Blob Storage** ผ่านฟังก์ชัน `put()` จาก `@vercel/blob`
- อัปโหลดใน Vercel Internal Network เร็วระดับ 0.1-0.5 วินาที ได้ Public URL ทันที
- Next.js ส่ง **Public URL** (`https://...public.blob.vercel-storage.com/...`) ให้ FastAPI ดาวน์โหลดไปประมวลผล
- บันทึกใน MongoDB ด้วย `provider: "vercel-blob"` และ `url: blob.url`
- หน้าประวัติและหน้าเว็บแสดงผลผ่าน `url` ของ Vercel Blob โดยตรง

### การลบรูปภาพ (`deleteImage`)
- `provider === "vercel-blob"`: เรียก `del(targetUrl)` จาก `@vercel/blob` (ต้องมี `BLOB_READ_WRITE_TOKEN`)
- `provider === "local"`: เรียก `fs.promises.unlink()` ลบไฟล์ออกจากดิสก์

---

## Flow: สแกนสิว (Analyze)

```
1. ผู้ใช้อัปโหลดรูป (หน้าเว็บ)
       ↓
2. Next.js API (POST /api/analyze) ตรวจสอบ Session และ User ใน MongoDB
       ↓
3. บันทึกรูปตาม Environment:
   - Dev/Docker → เซฟลงดิสก์
   - Hosted → อัปโหลดขึ้น Vercel Blob ได้ Public URL
       ↓
4. Next.js ดึง Active Model จาก MongoDB
       ↓
5. Next.js ยิง POST /predict ไปที่ FastAPI บน Render.com พร้อม:
   - image_url_or_path = URL (Vercel Blob) หรือ Absolute Path (Local)
   - model_url_or_path = http://<app>/api/models/{id}
       ↓
6. FastAPI รับข้อมูล:
   - รูป: ดาวน์โหลดจาก URL หรืออ่านจาก Path ตรงๆ
   - โมเดล: ดาวน์โหลดจาก /api/models/{id} → Cache ไว้ที่ /app/models/ (ถ้ามี cache แล้ว โหลดเลย)
       ↓
7. FastAPI รัน YOLO inference → return JSON (detections, counts, total)
       ↓
8. Next.js คำนวณ Severity (AAD/ALADIN) → บันทึกลง MongoDB → ส่ง JSON กลับหน้าเว็บ
```

---

## Flow: อัปโหลดและจัดการโมเดล (Admin)

```
1. Admin เลือกไฟล์ .pt → POST /api/models
       ↓
2. Next.js รับไฟล์ → แปลงเป็น Buffer → บันทึกลง MongoDB:
   AiModel { modelData: <Binary Bytes>, provider: "mongodb", fileName, sizeMb, isActive }
       ↓
3. โมเดลพร้อมใช้งานทันที ทุกเซิร์ฟเวอร์ดึงผ่าน GET /api/models/[id] ได้ตรงกัน
```

### FastAPI Model Cache
```
FastAPI รับ model_url_or_path = "https://<app>/api/models/[id]"
       ↓
เช็คว่ามีไฟล์ใน /app/models/<filename> ไหม?
  - มีแล้ว (Cache hit)  → โหลดโมเดลรันได้ทันที
  - ไม่มี (Cache miss) → Download Binary จาก URL → เซฟแคชที่ /app/models/ → โหลดรัน
```

> `/app/models/` ในฝั่ง FastAPI = **Cache เท่านั้น** ไม่ใช่ source of truth
> Source of truth = MongoDB `modelData` field ในตาราง `AiModel`

---

## สถาปัตยกรรม API Routes & Server Actions

โปรเจกต์นี้แยกการทำงานเป็น **API Routes 100%** สำหรับการทำ CRUD ทั้งหมด และใช้ Client Services ในการเรียก `fetch()`:

### API Endpoints ทั้งหมด (12 เส้น)

| หมวด | Method & Path | ผู้เรียก / สิทธิ์ | รายละเอียดการทำงาน |
|---|---|---|---|
| **Account** | `POST /api/account/register` | Public | สมัครสมาชิกใหม่ (แฮชรหัสผ่าน บันทึกลง MongoDB) |
| | `GET / POST /api/auth/[...nextauth]` | Browser | NextAuth Session, Google OAuth, Callbacks |
| **Analyze** | `POST /api/analyze` | User / Admin | วิเคราะห์สิว (เซฟรูป → ส่ง AI → ประเมิน Severity → บันทึก DB) |
| | `DELETE /api/analyze/history` | Admin Only | ลบประวัติการวิเคราะห์ (เดี่ยว `{ id }` หรือกลุ่ม `{ ids: [] }`) พร้อมลบรูป |
| **Images** | `GET /api/images/[...path]` | Browser | ดึงไฟล์รูปจาก Local Disk (โหมด Dev/Docker) |
| **Models** | `GET /api/models/[id]` | FastAPI (ส่ง `X-API-Key`) / Admin | ส่ง Binary (.pt) ของโมเดลจาก MongoDB ให้ดาวน์โหลด |
| | `POST /api/models` | Admin Only | อัปโหลดโมเดล .pt แปลงเป็น Binary บันทึกลง MongoDB |
| | `POST /api/models/[id]/activate` | Admin Only | ตั้งให้โมเดลนี้เป็นโมเดลหลัก (`isActive: true`) |
| | `PATCH /api/models/[id]` | Admin Only | แก้ไขชื่อ, เวอร์ชั่น, คำอธิบาย และค่าประเมินโมเดล |
| | `DELETE /api/models/[id]` | Admin Only | ลบโมเดลเดี่ยวออกจาก MongoDB (ลบโมเดลหลักไม่ได้) |
| | `DELETE /api/models` | Admin Only | ลบโมเดลแบบกลุ่ม (ป้องกันการลบโมเดลที่กำลัง Active) |
| **Users** | `DELETE /api/users/[id]` | Admin Only | ลบผู้ใช้เดี่ยว พร้อมกวาดลบรูปและประวัติทั้งหมด (กันลบตัวเอง) |
| | `DELETE /api/users` | Admin Only | ลบผู้ใช้แบบกลุ่มพร้อมเคลียร์รูปและประวัติทั้งหมด |

### ข้อยกเว้น Server Actions
- เหลือเฉพาะ `src/app/actions/auth-actions.ts` (`loginWithCredentials`, `loginWithGoogle`) สำหรับฟอร์ม Login เท่านั้น เนื่องจาก NextAuth v5 กำหนดให้การเซ็ต Cookie ต้องทำงานใน Server Action Context

---

## โครงสร้างไฟล์สำคัญ

```
apps/
├── web/
│   ├── src/lib/storage/
│   │   ├── image-provider.ts   ← switch Local (disk) / Hosted (Vercel Blob)
│   │   └── model-provider.ts   ← MongoDB Binary เสมอ
│   ├── src/server/             ← Business logic ฝั่ง server (Prisma, import "server-only")
│   │   ├── analyze.ts          ← คำนวณ severity, ยิงหา FastAPI
│   │   ├── auth.ts             ← registerUserLogic
│   │   ├── history.ts          ← getHistory / deleteHistories
│   │   ├── models.ts           ← CRUD โมเดล
│   │   ├── statistics.ts       ← สถิติหน้าแอดมิน
│   │   └── users.ts            ← รายชื่อ / ลบผู้ใช้
│   ├── src/lib/api-client/     ← Client-side API fetchers (apiRequest)
│   │   ├── analyze-api.ts      ← fetch /api/analyze
│   │   ├── auth-api.ts         ← fetch /api/account/register
│   │   ├── model-api.ts        ← fetch /api/models
│   │   └── user-api.ts         ← fetch /api/users
│   ├── src/app/actions/
│   │   └── auth-actions.ts     ← Server Actions เฉพาะ signIn credentials/google
│   └── src/app/api/            ← Next.js Route Handlers
├── ai/
│   ├── app/main.py             ← /predict endpoint (FastAPI บน Render.com)
│   ├── app/config.py           ← MODELS_PATH (cache dir)
│   └── models/                 ← FastAPI model cache
└── images/                     ← รูปภาพ local shared volume (dev/docker)
```

---

## กฎการประเมินความรุนแรงของสิว (Severity Rules)

การคำนวณและประเมินระดับความรุนแรง อ้างอิงตามแนวทางสถาบันโรคผิวหนังแห่งสหรัฐอเมริกา (AAD) และ ALADIN

**ไฟล์ที่เกี่ยวข้อง:**
- `apps/web/src/server/analyze.ts` (Logic คำนวณ `calculateSeverity`)
- `apps/web/src/types/analyze.ts` (ชื่อภาษาไทยและข้อความคำแนะนำ)
- `apps/web/src/components/analyze/analysis-result.tsx` (UI แสดงผล)

**การจัดกลุ่มสิว:**
- **ไม่อักเสบ (Non-inflammatory):** สิวหัวดำ (blackhead), สิวหัวขาว (whitehead)
- **อักเสบระดับตื้น (Shallow inflammatory):** สิวตุ่มแดง (papule), สิวหัวหนอง (pustule)
- **อักเสบระดับลึก (Deep inflammatory):** สิวก้อนแข็ง (nodule), สิวซีสต์ (cyst)

**เกณฑ์การประเมิน:**
1. **SEVERE (รุนแรง):** อักเสบตื้น > 20 จุด **หรือ** อักเสบลึก ≥ 1 จุด
2. **MODERATE (ปานกลาง):** ไม่อักเสบ > 20 จุด **หรือ** อักเสบตื้น 6 ถึง 20 จุด
3. **MILD (เล็กน้อย):** ไม่อักเสบ ≤ 20 จุด **และ** อักเสบตื้น ≤ 5 จุด

---

## Technical Notes (ข้อควรระวังสำหรับนักพัฒนา)

1. **Render.com Free Tier (Keep-Alive):**
   - Render แพลนฟรีจะ Sleep ตัวเองหลังไม่มีคนใช้งานเกิน 15 นาที ทำให้การยิงครั้งแรกช้า (Cold Start ~30-50 วินาที)
   - แนะนำให้ตั้ง Cron Job (เช่น `cron-job.org` หรือ `UptimeRobot`) ยิง Ping ไปที่ `GET https://<app>.onrender.com/health` ทุกๆ 5-10 นาทีเพื่อไม่ให้เซิร์ฟเวอร์หลับ

2. **การบันทึกไฟล์ Binary ลง MongoDB (Prisma):**
   - ไฟล์โมเดล `.pt` ในฟิลด์ `Bytes` ของ Prisma/MongoDB **ต้องแปลงเป็น `Buffer` เสมอ** (`Buffer.from(await file.arrayBuffer())`)
   - **ห้าม** ใช้ `Uint8Array` ตรงๆ เพราะข้อมูลจะกลายเป็น `null` ในฐานข้อมูล ส่งผลให้ไฟล์โมเดลเสียหาย (0 bytes)

3. **Next.js 15/16 Dynamic Route Params:**
   - ทุก Route Handler ที่มี dynamic params (เช่น `[id]`, `[...path]`) ต้องใช้ `await params` เสมอ เพราะ params เป็น Promise

4. **Vercel Blob Storage Token:**
   - บน Vercel Dashboard ต้องผูก Blob Store เข้ากับโปรเจกต์ เพื่อให้ได้ `BLOB_READ_WRITE_TOKEN` อัตโนมัติ
   - หากรันโหมด `APP_ENV=hosted` ในเครื่องเพื่อทดสอบ ต้องนำ Token มาใส่ใน `.env`
