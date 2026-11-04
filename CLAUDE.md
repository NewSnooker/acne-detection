# AcneAI — แผนที่โปรเจค (CLAUDE.md)

ระบบตรวจจับและจำแนกสิว 6 ชนิดจากภาพถ่ายใบหน้า (Object Detection) พร้อมประเมินความรุนแรงและคำแนะนำดูแลผิว
โครงงานจบ (senior capstone) — repo: `NewSnooker/acne-detection`

ไฟล์นี้เป็น **แผนที่** เท่านั้น รายละเอียดอยู่ใน `dev-docs/` ให้เปิดอ่านเฉพาะไฟล์ที่เกี่ยวกับงานที่ทำ

@apps/web/AGENTS.md

## ภาพรวม 30 วินาที

```
Browser ──► Next.js 16 (apps/web)  ──X-API-Key──►  FastAPI + YOLO (apps/ai)
              │  Auth.js (JWT), API Routes            │  POST /predict
              │  Prisma                                │  โหลดรูปจาก path/URL
              ▼                                        │  โหลดโมเดลจาก GET /api/models/[id] (cache ลงดิสก์)
           MongoDB (User, AiModel+ไฟล์ .pt, Image, Analysis)
              ▲
        รูป/โมเดล: Docker volume (image_files, model_files) | Vercel Blob + modelData | Azure Blob
```

- Next.js เป็นทั้ง Frontend และ Backend หลัก (auth, CRUD, คำนวณ severity, บันทึกผล)
- FastAPI ทำ inference อย่างเดียว ไม่แตะฐานข้อมูล
- **แต่ละ environment (Docker / Vercel+Render / Azure) มีฐานข้อมูลและที่เก็บไฟล์ของตัวเอง ห้ามใช้ปนกัน** — เลือกที่เก็บด้วย `IMAGE_STORAGE` / `MODEL_STORAGE` ใน `lib/storage/config.ts` ที่เดียว (ดู `dev-docs/environments.md`) ai โหลดโมเดลผ่าน `GET /api/models/[id]` เสมอ โฟลเดอร์ `apps/ai/models/` เป็นแค่ cache

## โครงสร้างโฟลเดอร์

```
acne-ai-v1/
├── CLAUDE.md                 ← ไฟล์นี้
├── dev-docs/             ← เอกสารสำหรับนักพัฒนา/AI (ดูตารางด้านล่าง)
├── README.md                 ← หน้าแรก + สารบัญลิงก์ไปคู่มือ
├── manual/                   ← คู่มือการใช้งาน 6 ไฟล์ (เริ่มต้น, ผู้ใช้, แอดมิน, ตั้งค่า, แก้ปัญหา, นักพัฒนา)
├── docker-compose.yml        ← mongodb (replica set) + ai + web (รันได้โดยไม่มี .env)
├── docker-compose.dev.yml    ← ส่วนเสริมสำหรับพัฒนา
├── apps/
│   ├── web/                  ← Next.js 16, React 19, TS, Tailwind 4, Prisma 6, Auth.js v5
│   │   ├── prisma/schema.prisma
│   │   ├── prisma/seed.mjs           ← สร้างแอดมิน + โมเดลเริ่มต้น (รันตอน container เริ่ม)
│   │   └── src/
│   │       ├── proxy.ts              ← middleware ของ Next 16 (กัน route ที่ต้อง login / admin)
│   │       ├── app/(auth)/           ← /login, /register
│   │       ├── app/(dashboard)/      ← /analyze, /history, /statistics, /admin/*
│   │       ├── app/api/              ← Route Handlers (backend)
│   │       ├── app/actions/          ← Server Actions (เฉพาะ login)
│   │       ├── server/               ← business logic ฝั่ง server (Prisma, import "server-only") แยกไฟล์ตาม feature
│   │       ├── lib/storage/          ← config.ts (เลือกที่เก็บจาก env), image-provider, model-provider, azure-blob
│   │       ├── lib/auth*.ts          ← Auth.js config
│   │       ├── lib/api-client/       ← fetch wrapper ฝั่ง client (เรียก /api/*)
│   │       ├── components/           ← admin, analyze, auth, history, layout, statistics, ui
│   │       ├── schemas/              ← zod (auth)
│   │       └── types/analyze.ts      ← type + ค่าคงที่ (สี, ชื่อไทย, คำแนะนำ)
│   ├── ai/                   ← FastAPI + Ultralytics
│   │   ├── app/main.py               ← endpoints ทั้งหมด
│   │   ├── app/services/yolo_service.py  ← โหลด/cache โมเดล + predict
│   │   └── app/config.py
│   └── images/               ← รูปที่ผู้ใช้อัปโหลด (dev/docker, gitignored)
├── docs/                     ← เอกสารเล่มโครงงาน, draw.io, สไลด์ (gitignored — ไม่ใช่เอกสารโค้ด)
└── Claude outputs/           ← ไฟล์ที่ Claude เคยสร้าง (gitignored)
```

## เอกสารแยก (อ่านตามงาน)

| ไฟล์ | อ่านเมื่อ |
|---|---|
| `dev-docs/environments.md` | **แก้เรื่อง deploy / ที่เก็บรูปและโมเดล / env** — ระบบแต่ละชุด, ตัวแปร, การกันพลาด |
| `dev-docs/azure-deploy.md` | ขึ้นระบบบน Azure (Container Apps + Blob + Atlas) คลิกทีละขั้นใน Portal |
| `dev-docs/architecture.md` | ต้องเข้าใจ flow วิเคราะห์สิว, การเก็บรูป/โมเดล |
| `dev-docs/web-app.md` | แก้โค้ด Next.js — route, layer, component, auth |
| `dev-docs/api-reference.md` | แก้/เพิ่ม endpoint ทั้งฝั่ง Next.js และ FastAPI |
| `dev-docs/data-model.md` | แก้ Prisma schema หรือ query |
| `dev-docs/ai-service.md` | แก้ FastAPI / YOLO inference |
| `dev-docs/scope-traceability.md` | เช็คว่าโค้ดตรงกับขอบเขตในเล่ม (บทที่ 1) หรือยัง |
| `dev-docs/refactor-plan.md` | **ก่อนรีแฟกเตอร์** — รายการปัญหาและลำดับที่ควรแก้ |
| `dev-docs/performance/web.md` | ดูผลวัดความเร็วการวิเคราะห์ (Docker / รันในเครื่อง / Render) ก่อนแก้เรื่องความเร็ว |
| `dev-docs/performance/tta.md` | ผลวัด Test-Time Augmentation (ปกติ vs TTA) + วิธีทำงาน + ข้อความสำหรับเล่ม — ก่อนแก้เรื่อง TTA |
| `dev-docs/experiments.md` | **บันทึกการทดลอง/การตัดสินใจฝั่งโมเดล** (TTA, conf, agnostic NMS ฯลฯ) — เพิ่มแถวทุกครั้งที่ทดลองหรือเปลี่ยนค่า |
| `dev-docs/limitations.md` | ข้อจำกัดที่ทราบและสาเหตุ (เช่น อัปโหลดโมเดลบน Vercel ไม่ได้) — อ่านก่อนลงมือแก้เรื่องที่อาจเป็นข้อจำกัดอยู่แล้ว |
| `manual/*.md` | แก้พฤติกรรมที่ผู้ใช้เห็น (หน้าจอ, ข้อความ, ขั้นตอนติดตั้ง, ค่าตั้ง) — ต้องอัปเดตคู่มือให้ตรง |
| `dev-docs/testing.md` | เขียนหรือรันชุดทดสอบ — รายการไฟล์ทดสอบเทียบกับขอบเขตในเล่ม และสิ่งที่ยังไม่ครอบคลุม |
| `dev-docs/docker-quickstart-plan.md` | แก้ Docker / ข้อมูลเริ่มต้น — แผนและสถานะงาน "โหลดแล้วเปิด Docker ใช้ได้เลย" |

## คำสั่งที่ใช้บ่อย

```bash
# Web (apps/web)
npm run dev                 # http://localhost:3000
npm run build               # prisma generate && next build
npm run lint
npm run typecheck           # tsc --noEmit
npm test                    # ชุดทดสอบ (Vitest)
npm run format              # จัดรูปแบบด้วย prettier (CI เช็คด้วย format:check)
npx prisma generate         # หลังแก้ schema.prisma
npx prisma db push          # sync schema ขึ้น MongoDB (ไม่มี migration สำหรับ MongoDB)

# AI (apps/ai) — Windows
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
venv\Scripts\python.exe -m pytest   # ชุดทดสอบ (ติดตั้ง requirements-dev.txt ก่อน)

# Docker ทั้งระบบ (ไม่ต้องมี .env — แอดมินเริ่มต้น admin@acne.local / Admin1234)
docker compose up --build
# Docker สำหรับพัฒนา (เปิด port 8000 + hot reload ฝั่ง ai) — MongoDB ของ Docker อยู่ที่ localhost:27018
# npm run dev ใช้ MongoDB ของ Docker (docker compose up -d mongodb) database acne_dev — ดู manual/06-developer-guide.md
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# ข้อมูลเริ่มต้น (apps/web) — สร้างแอดมินและใส่โมเดลเริ่มต้นถ้ายังไม่มี
npm run db:seed
# ล้างข้อมูลที่ปนข้าม environment ใน Atlas (ดูรายการก่อน, ลบจริงต้อง --apply)
npm run db:cleanup
```

CI (`.github/workflows/ci.yml`) รันทุก push เข้า `main` และทุก PR: เว็บ = format:check + lint + typecheck + test, AI = pytest (ไม่ติดตั้ง torch)

## กฎเหล็ก (ต้องรู้ก่อนแก้โค้ด)

1. **Next.js 16** — middleware ชื่อ `src/proxy.ts`, `params`/`searchParams` เป็น Promise ต้อง `await` เสมอ อ่าน `node_modules/next/dist/docs/` ก่อนใช้ API ที่ไม่แน่ใจ
2. **เกณฑ์ severity ต้องตรงกับเล่มข้อ 1.3.3.5** — อยู่ที่ `calculateSeverity()` ใน `server/analyze.ts` ห้ามแก้ตัวเลขโดยไม่แก้เล่ม
3. **ชื่อคลาสสิว 6 ตัว** (`blackhead, whitehead, papule, pustule, nodule, cyst`) ใช้เป็น key ร่วมกันทั้ง Python, DB (`Analysis.counts`), และ UI ห้ามเปลี่ยนตัวสะกด
4. **ลำดับ index คลาส** ถูก hard-code ใน `yolo_service.py` (`ACNE_CLASSES`) ต้องตรงกับโมเดลที่เทรน
5. **Prisma `Bytes`** ต้องส่ง `Buffer` เท่านั้น (`Uint8Array` จะกลายเป็น null)
6. **MongoDB + Prisma** ต้องเป็น replica set (docker-compose ตั้งให้แล้ว) และไม่มี migration ใช้ `db push`
7. Login ต้องผ่าน Server Action (`app/actions/auth-actions.ts`) เพราะ Auth.js ต้อง set cookie — CRUD อื่นผ่าน API Routes
8. สิทธิ์ admin ต้องเช็ค **ทั้ง** ใน `proxy.ts` (หน้า `/admin/*`) **และ** ในทุก route handler (`session.user.role === "ADMIN"`)
9. ห้าม commit `.env`, ไฟล์ `.pt`, รูปใน `apps/images/`
10. UI และข้อความ error เป็นภาษาไทย — error ที่ผู้ใช้ควรเห็นให้โยน `HttpError(status, ข้อความ)` (`lib/http-error.ts`) และตรวจ body ด้วย zod ผ่าน `parseBody`
11. ห้ามฝัง key หรือ secret ในโค้ด — ค่าเริ่มต้นสำหรับ Docker อยู่ใน `docker-compose.yml` ที่เดียว และ `AI_SERVICE_API_KEY` ของ web กับ ai ต้องเป็นค่าเดียวกัน
12. ห้ามใช้ `any` (lint เป็น error) — ใช้ type จาก `@prisma/client` หรือ `unknown` แล้ว narrow
13. ห้ามใช้ฐานข้อมูลของ environment อื่น (เช่นรันในเครื่องแล้วต่อ Atlas ของเว็บจริง) — ระบบจะไม่ยอมเริ่มถ้าเก็บไฟล์ลงดิสก์แต่ต่อ Atlas

## ศัพท์ในโปรเจค

| คำ | ความหมาย |
|---|---|
| ไม่อักเสบ (non-inflammatory) | blackhead + whitehead |
| อักเสบตื้น (shallow) | papule + pustule |
| อักเสบลึก (deep) | nodule + cyst |
| Active model | `AiModel.isActive = true` — ตัวที่ใช้วิเคราะห์ มีได้ตัวเดียว |
| `APP_ENV=hosted` | ค่าเดิมของ Vercel — ไม่ตั้ง `IMAGE_STORAGE` จะได้ `vercel-blob` (ดู `dev-docs/environments.md`) |
| environment | ระบบหนึ่งชุด (Docker / Vercel+Render / Azure) = เว็บ + AI + ฐานข้อมูล + ที่เก็บไฟล์ของตัวเอง |
