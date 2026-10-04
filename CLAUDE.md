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
        รูปภาพ: apps/images/ (dev/docker)  |  Vercel Blob (APP_ENV=hosted)
```

- Next.js เป็นทั้ง Frontend และ Backend หลัก (auth, CRUD, คำนวณ severity, บันทึกผล)
- FastAPI ทำ inference อย่างเดียว ไม่แตะฐานข้อมูล
- ไฟล์โมเดล `.pt` เก็บใน MongoDB (`AiModel.modelData`) — โฟลเดอร์ `apps/ai/models/` เป็นแค่ cache

## โครงสร้างโฟลเดอร์

```
acne-ai-v1/
├── CLAUDE.md                 ← ไฟล์นี้
├── dev-docs/             ← เอกสารสำหรับนักพัฒนา/AI (ดูตารางด้านล่าง)
├── README.md                 ← system context เดิม (บางจุดล้าสมัย ยึด dev-docs เป็นหลัก)
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
│   │       ├── lib/services/         ← business logic ฝั่ง server (Prisma)
│   │       ├── lib/storage/          ← image-provider (local/Vercel Blob), model-provider (MongoDB)
│   │       ├── lib/auth*.ts          ← Auth.js config
│   │       ├── services/             ← fetch wrapper ฝั่ง client (เรียก /api/*)
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
| `dev-docs/architecture.md` | ต้องเข้าใจ flow วิเคราะห์สิว, environment 3 แบบ, การเก็บรูป/โมเดล |
| `dev-docs/web-app.md` | แก้โค้ด Next.js — route, layer, component, auth |
| `dev-docs/api-reference.md` | แก้/เพิ่ม endpoint ทั้งฝั่ง Next.js และ FastAPI |
| `dev-docs/data-model.md` | แก้ Prisma schema หรือ query |
| `dev-docs/ai-service.md` | แก้ FastAPI / YOLO inference |
| `dev-docs/scope-traceability.md` | เช็คว่าโค้ดตรงกับขอบเขตในเล่ม (บทที่ 1) หรือยัง |
| `dev-docs/refactor-plan.md` | **ก่อนรีแฟกเตอร์** — รายการปัญหาและลำดับที่ควรแก้ |
| `dev-docs/docker-quickstart-plan.md` | แก้ Docker / ข้อมูลเริ่มต้น — แผนและสถานะงาน "โหลดแล้วเปิด Docker ใช้ได้เลย" |

## คำสั่งที่ใช้บ่อย

```bash
# Web (apps/web)
npm run dev                 # http://localhost:3000
npm run build               # prisma generate && next build
npm run lint
npx prisma generate         # หลังแก้ schema.prisma
npx prisma db push          # sync schema ขึ้น MongoDB (ไม่มี migration สำหรับ MongoDB)

# AI (apps/ai) — Windows
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Docker ทั้งระบบ (ไม่ต้องมี .env — แอดมินเริ่มต้น admin@acne.local / Admin1234)
docker compose up --build
# Docker สำหรับพัฒนา (เปิด port 8000/27017 + hot reload ฝั่ง ai)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# ข้อมูลเริ่มต้น (apps/web) — สร้างแอดมินและใส่โมเดลเริ่มต้นถ้ายังไม่มี
npm run db:seed
```

ยังไม่มี test และ CI ในโปรเจค

## กฎเหล็ก (ต้องรู้ก่อนแก้โค้ด)

1. **Next.js 16** — middleware ชื่อ `src/proxy.ts`, `params`/`searchParams` เป็น Promise ต้อง `await` เสมอ อ่าน `node_modules/next/dist/docs/` ก่อนใช้ API ที่ไม่แน่ใจ
2. **เกณฑ์ severity ต้องตรงกับเล่มข้อ 1.3.3.5** — อยู่ที่ `calculateSeverity()` ใน `lib/services/analyze-logic.ts` ห้ามแก้ตัวเลขโดยไม่แก้เล่ม
3. **ชื่อคลาสสิว 6 ตัว** (`blackhead, whitehead, papule, pustule, nodule, cyst`) ใช้เป็น key ร่วมกันทั้ง Python, DB (`Analysis.counts`), และ UI ห้ามเปลี่ยนตัวสะกด
4. **ลำดับ index คลาส** ถูก hard-code ใน `yolo_service.py` (`ACNE_CLASSES`) ต้องตรงกับโมเดลที่เทรน
5. **Prisma `Bytes`** ต้องส่ง `Buffer` เท่านั้น (`Uint8Array` จะกลายเป็น null)
6. **MongoDB + Prisma** ต้องเป็น replica set (docker-compose ตั้งให้แล้ว) และไม่มี migration ใช้ `db push`
7. Login ต้องผ่าน Server Action (`app/actions/auth-actions.ts`) เพราะ Auth.js ต้อง set cookie — CRUD อื่นผ่าน API Routes
8. สิทธิ์ admin ต้องเช็ค **ทั้ง** ใน `proxy.ts` (หน้า `/admin/*`) **และ** ในทุก route handler (`session.user.role === "ADMIN"`)
9. ห้าม commit `.env`, ไฟล์ `.pt`, รูปใน `apps/images/`
10. UI และข้อความ error เป็นภาษาไทย
11. ห้ามฝัง key หรือ secret ในโค้ด — ค่าเริ่มต้นสำหรับ Docker อยู่ใน `docker-compose.yml` ที่เดียว และ `AI_SERVICE_API_KEY` ของ web กับ ai ต้องเป็นค่าเดียวกัน

## ศัพท์ในโปรเจค

| คำ | ความหมาย |
|---|---|
| ไม่อักเสบ (non-inflammatory) | blackhead + whitehead |
| อักเสบตื้น (shallow) | papule + pustule |
| อักเสบลึก (deep) | nodule + cyst |
| Active model | `AiModel.isActive = true` — ตัวที่ใช้วิเคราะห์ มีได้ตัวเดียว |
| `APP_ENV=hosted` | โหมด Vercel + Render (รูปขึ้น Vercel Blob) ค่าอื่น = เก็บลงดิสก์ |
