# Environments — ระบบแต่ละชุดและที่เก็บไฟล์

อัปเดตล่าสุด 2026-11-01

## หลักการ (อ่านก่อนแก้เรื่อง deploy / ที่เก็บไฟล์)

1. **โค้ดชุดเดียว branch เดียว (`main`)** — ทุกที่รันโค้ดเดียวกัน ต่างกันแค่ env
2. **แต่ละ environment มีฐานข้อมูล + ที่เก็บไฟล์ + บริการ AI ของตัวเอง** ห้ามใช้ปนกัน
   ฐานข้อมูลเก็บแค่ "ชื่อไฟล์/ที่อยู่ไฟล์" ถ้าฐานข้อมูลชุดหนึ่งชี้ไปหาไฟล์ที่อยู่บนดิสก์ของอีกเครื่อง เครื่องอื่นจะเปิดไม่ได้
   (เคยเกิดจริง: รันในเครื่องแต่ต่อ Atlas ของเว็บจริง → รูปหาย ENOENT, Render โหลดโมเดลไม่ได้ 400)
3. **โค้ดห้ามเช็คชื่อ environment เอง** — เลือกที่เก็บผ่าน `lib/storage/config.ts` ที่เดียว
4. ต้องการข้อมูลจากอีกชุด → ใช้สคริปต์ (seed / export) ไม่ใช่ต่อฐานข้อมูลตรง

อ้างอิง: The Twelve-Factor App — Config, Backing services, Dev/prod parity

## ระบบที่มี

| ชุด | ใช้ทำอะไร | เว็บ / AI | ฐานข้อมูล | รูป (`IMAGE_STORAGE`) | โมเดล (`MODEL_STORAGE`) |
|---|---|---|---|---|---|
| **Docker** | ผู้ใช้ดาวน์โหลดไปติดตั้งเอง + พัฒนาในเครื่อง | container `web` / `ai` | container `mongodb` (volume `mongodb_data`) | `local` → volume `image_files` | `file` → volume `model_files` (ไม่จำกัดขนาด) |
| **Vercel + Render** | เว็บตัวอย่างบนบริการฟรี (เก็บไว้อ้างอิงในเล่ม) | Vercel / Render | Atlas database เดิม | `vercel-blob` | `mongodb` (`modelData`) อัปโหลดได้ ≤ 4.5 MB (เพดานของ Vercel) |
| **Azure** (กำลังทำ) | ระบบหลัก วัดผลในเล่ม | Container Apps / Container Apps | Atlas database ใหม่ (`acne_azure`) | `azure-blob` (ยังไม่มีในโค้ด) | `azure-blob` (ยังไม่มีในโค้ด) |

`npm run dev` ในเครื่อง (ไม่ใช้ Docker) = ชุด dev: ใช้ MongoDB ในเครื่อง/ใน Docker ไม่ใช่ Atlas ของเว็บจริง

## ตัวแปรที่เลือกที่เก็บ (`apps/web/src/lib/storage/config.ts`)

| ตัวแปร | ค่า | ไม่ตั้ง = |
|---|---|---|
| `IMAGE_STORAGE` | `local` (โฟลเดอร์ `STORAGE_PATH`) · `vercel-blob` | `APP_ENV=hosted` → `vercel-blob` อื่น ๆ → `local` |
| `MODEL_STORAGE` | `file` (โฟลเดอร์ `MODEL_STORAGE_PATH`) · `mongodb` (`AiModel.modelData` ≤ 15 MB) | มี `MODEL_STORAGE_PATH` → `file` อื่น ๆ → `mongodb` |
| `ENV_NAME` | ชื่อที่แสดงบนหัวหน้าแอดมิน เช่น `docker`, `vercel`, `azure` | เดาจาก `VERCEL` / `APP_ENV` |
| `ALLOW_SHARED_DB` | `true` = ยอมให้ที่เก็บบนดิสก์ใช้คู่กับ Atlas | ไม่ยอม |

- ของที่บันทึกแล้วจำ `provider` ของตัวเองไว้ (`Image.provider`, `AiModel.provider`) — เปลี่ยนตัวแปรมีผลกับ**ของที่อัปโหลดใหม่**เท่านั้น ของเก่ายังอ่านจากที่เดิม
- ขนาดโมเดลสูงสุด: `maxModelUploadBytes()` — `file` ไม่จำกัด, `mongodb` 15 MB, บน Vercel 4.5 MB หน้าอัปโหลดบอกตั้งแต่เลือกไฟล์

## การกันพลาด

| จุด | ทำอะไร |
|---|---|
| `src/instrumentation.ts` | ตอนเซิร์ฟเวอร์เริ่ม: `DATABASE_URL` เป็น `mongodb+srv://` (Atlas) แต่ `IMAGE_STORAGE=local` หรือ `MODEL_STORAGE=file` → **ไม่ยอมเริ่ม** พร้อมข้อความบอกวิธีแก้ ค่าตัวแปรสะกดผิดก็แจ้งตั้งแต่เริ่ม |
| หัวหน้าแดชบอร์ด (แอดมิน) | ป้ายชื่อ environment เช่น `DOCKER` `VERCEL` — รู้ว่ากำลังแก้ข้อมูลของระบบไหน |
| `npm run db:cleanup` | ล้างข้อมูลที่เคยปนใน Atlas (ประวัติที่รูปอยู่บนดิสก์เครื่องอื่น, โมเดล `file`/`chunks`, collection `AiModelChunk`) ค่าเริ่มต้นแค่แสดงรายการ ลบจริงต้อง `--apply` ไม่ยอมรันกับฐานข้อมูลที่ไม่ใช่ Atlas |

## ตั้งค่าแต่ละชุด

**Docker** — ตั้งไว้ใน `docker-compose.yml` แล้ว (`IMAGE_STORAGE=local`, `MODEL_STORAGE=file`, `ENV_NAME=docker`) ไม่ต้องมี `.env`

**npm run dev ในเครื่อง** — `apps/web/.env`:
```
DATABASE_URL=mongodb://localhost:27017/acne_db?replicaSet=rs0&directConnection=true   # เปิด MongoDB ของ Docker อย่างเดียว: docker compose up -d mongodb
IMAGE_STORAGE=local
MODEL_STORAGE=mongodb          # หรือ file + MODEL_STORAGE_PATH
ENV_NAME=dev
```

**Vercel** — Settings → Environment Variables: `APP_ENV=hosted` (หรือ `IMAGE_STORAGE=vercel-blob`), `MODEL_STORAGE=mongodb`, `ENV_NAME=vercel`, `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL` (Atlas database เดิม)
ฝั่ง Render ใช้โมเดลเล็ก (เช่น best.pt 5 MB) — RAM 512 MB รันโมเดล L ไม่ไหว (instance รีสตาร์ท)

**Azure** — ขั้นตอนจะเพิ่มเมื่อเพิ่ม `azure-blob` ในโค้ด

## เมื่อแก้ `schema.prisma`

ต้องรัน `npx prisma db push` กับฐานข้อมูลของ**ทุกชุด**: Docker ทำเองตอน container เริ่ม, Atlas แต่ละ database ต้องรันเอง (Vercel build รันแค่ `prisma generate`)
