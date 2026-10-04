# 6. คู่มือนักพัฒนา

[← แก้ปัญหา](05-troubleshooting.md) · [หน้าหลัก](../README.md)

สำหรับคนที่จะแก้โค้ด รายละเอียดเชิงลึกของโค้ดอยู่ใน [`dev-docs/`](../dev-docs/)

<a id="toc"></a>

## สารบัญ

- [เลือกวิธีรัน](#choose)
- [วิธีที่ 1 Docker สำหรับพัฒนา](#docker-dev)
- [วิธีที่ 2 รันแบบไม่ใช้ Docker](#local)
- [ดูข้อมูลในฐานข้อมูลของ Docker](#database)
- [คำสั่งที่ใช้บ่อย](#commands)
- [ไฟล์ตั้งค่าและตัวแปร](#env)
- [โครงสร้างโค้ดโดยย่อ](#structure)
- [ก่อน commit](#before-commit)
- [การ deploy](#deploy)

---

<a id="choose"></a>

## เลือกวิธีรัน

| วิธี | เหมาะกับ | ข้อสังเกต |
| --- | --- | --- |
| Docker ปกติ (`docker compose up --build`) | ทดสอบทั้งระบบเหมือนผู้ใช้จริง | แก้โค้ดแล้วต้อง build ใหม่ |
| Docker สำหรับพัฒนา | แก้โค้ดฝั่ง AI | AI โหลดโค้ดใหม่เองเมื่อแก้ไฟล์ และเปิด port 8000 |
| ไม่ใช้ Docker | แก้โค้ดฝั่งเว็บ | เว็บโหลดหน้าใหม่เองเมื่อแก้ไฟล์ (`npm run dev`) |

[↑ สารบัญ](#toc)

---

<a id="docker-dev"></a>

## วิธีที่ 1 Docker สำหรับพัฒนา

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

เพิ่มจาก Docker ปกติ:

- เปิด port ของ AI (8000) ออกมาที่เครื่อง
- mount โฟลเดอร์ `apps/ai` เข้า container และเปิด hot reload
- เปิดหน้า API docs ของ AI ที่ <http://localhost:8000/docs>

[↑ สารบัญ](#toc)

---

<a id="local"></a>

## วิธีที่ 2 รันแบบไม่ใช้ Docker

ต้องมี Node.js 20 ขึ้นไป, Python 3.10 ขึ้นไป (Docker ใช้ 3.12) และ MongoDB ที่เป็น replica set (ใช้ MongoDB Atlas สะดวกที่สุด)

**1. บริการ AI** (`apps/ai`)

```bash
cd apps/ai
python -m venv venv
venv\Scripts\pip install -r requirements.txt
copy .env.example .env
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**2. เว็บ** (`apps/web`) เปิด Terminal อีกหน้าต่าง

```bash
cd apps/web
npm install
copy .env.example .env
```

แก้ `apps/web/.env`:

| ตัวแปร | ใส่อะไร |
| --- | --- |
| `DATABASE_URL` | connection string ของ MongoDB |
| `AUTH_SECRET` | ข้อความสุ่มยาว ๆ |
| `AI_SERVICE_API_KEY` | ต้องตรงกับใน `apps/ai/.env` (ไฟล์ตัวอย่างสองฝั่งตั้งไว้ตรงกันแล้ว) |
| `STORAGE_PATH` | เว้นว่างไว้เพื่อใช้โฟลเดอร์ `apps/images` หรือใส่ path แบบเต็มของโฟลเดอร์ที่ต้องการ |

จากนั้น:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

เปิด <http://localhost:3000>

`npm run db:seed` สร้างแอดมินเริ่มต้นและใส่โมเดลเริ่มต้นถ้ายังไม่มี ถ้าไม่รัน คนแรกที่สมัครผ่านหน้าเว็บจะได้เป็นผู้ดูแลระบบ

คำสั่งด้านบนเป็นของ Windows บน macOS/Linux ใช้ `venv/bin/pip`, `venv/bin/python` และ `cp` แทน

[↑ สารบัญ](#toc)

---

<a id="database"></a>

## ดูข้อมูลในฐานข้อมูลของ Docker

MongoDB ใน Docker เปิด port ให้เฉพาะเครื่องนี้ ต่อด้วย MongoDB Compass หรือเครื่องมืออื่นได้ที่

```
mongodb://localhost:27017/acne_db?directConnection=true
```

ต้องมี `directConnection=true` เพราะฐานข้อมูลเป็น replica set ถ้าเปลี่ยน `MONGO_PORT` ให้แก้เลข port ตาม

[↑ สารบัญ](#toc)

---

<a id="commands"></a>

## คำสั่งที่ใช้บ่อย

สั่งใน `apps/web`

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | เปิดเว็บโหมดพัฒนา |
| `npm run build` | สร้าง Prisma Client แล้ว build เว็บ |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |
| `npx tsc --noEmit` | ตรวจ type |
| `npx prisma generate` | สร้าง Prisma Client ใหม่หลังแก้ `schema.prisma` |
| `npx prisma db push` | ส่งโครงสร้างขึ้น MongoDB |
| `npm run db:seed` | สร้างแอดมินและโมเดลเริ่มต้นถ้ายังไม่มี |

[↑ สารบัญ](#toc)

---

<a id="env"></a>

## ไฟล์ตั้งค่าและตัวแปร

| ไฟล์ | ใช้เมื่อ |
| --- | --- |
| `.env` (root) | รันด้วย Docker — เปลี่ยนค่าเริ่มต้นใน `docker-compose.yml` |
| `apps/web/.env` | รันเว็บแบบไม่ใช้ Docker และใส่ค่า Google login (Docker อ่านไฟล์นี้ด้วย) |
| `apps/ai/.env` | รัน AI แบบไม่ใช้ Docker |

ใน Docker ค่าที่อยู่ใน `environment:` ของ `docker-compose.yml` ชนะค่าใน `apps/web/.env` เสมอ

รายการตัวแปรทั้งหมด: [dev-docs/web-app.md](../dev-docs/web-app.md) และ [dev-docs/ai-service.md](../dev-docs/ai-service.md)

ห้ามใส่ key หรือรหัสลับลงในโค้ด และห้าม commit ไฟล์ `.env`

[↑ สารบัญ](#toc)

---

<a id="structure"></a>

## โครงสร้างโค้ดโดยย่อ

```
apps/web/src/
├── proxy.ts            ← ตรวจสิทธิ์ก่อนเข้าแต่ละหน้า (middleware ของ Next.js 16)
├── app/(auth)/         ← หน้าเข้าสู่ระบบ สมัครสมาชิก
├── app/(dashboard)/    ← หน้าวิเคราะห์ ประวัติ ภาพรวม และหน้าแอดมิน
├── app/api/            ← API ฝั่งเว็บ
├── lib/services/       ← logic ฝั่ง server (ติดต่อฐานข้อมูล)
├── lib/storage/        ← การเก็บรูปและโมเดล
├── services/           ← ตัวเรียก API จากฝั่งหน้าเว็บ
└── components/         ← ส่วนประกอบหน้าจอ

apps/ai/app/
├── main.py             ← API ของ AI (/health, /predict)
└── services/yolo_service.py  ← โหลดโมเดลและตรวจจับ
```

| อยากรู้เรื่อง | อ่าน |
| --- | --- |
| ภาพรวมและขั้นตอนการวิเคราะห์ | [dev-docs/architecture.md](../dev-docs/architecture.md) |
| โครงสร้างฝั่งเว็บ | [dev-docs/web-app.md](../dev-docs/web-app.md) |
| API ทั้งหมด | [dev-docs/api-reference.md](../dev-docs/api-reference.md) |
| ฐานข้อมูล | [dev-docs/data-model.md](../dev-docs/data-model.md) |
| บริการ AI | [dev-docs/ai-service.md](../dev-docs/ai-service.md) |
| สิ่งที่ควรปรับปรุง | [dev-docs/refactor-plan.md](../dev-docs/refactor-plan.md) |

[↑ สารบัญ](#toc)

---

<a id="before-commit"></a>

## ก่อน commit

1. `npx tsc --noEmit` ผ่าน
2. `npm run lint` ไม่มี error ในไฟล์ที่แก้
3. ถ้าแก้ Docker หรือ seed: ทดสอบด้วย `docker compose up --build` ในโฟลเดอร์ที่ clone ใหม่และไม่มีไฟล์ `.env`
4. ถ้าแก้เกณฑ์ระดับความรุนแรง (`calculateSeverity`) ต้องแก้ให้ตรงกับเอกสารโครงงานด้วย

[↑ สารบัญ](#toc)

---

<a id="deploy"></a>

## การ deploy

ระบบออกแบบให้ deploy เว็บบน Vercel และ AI บน Render ได้ โดยตั้ง `APP_ENV=hosted` เพื่อเก็บรูปบน Vercel Blob

สิ่งที่ต้องตั้งให้ครบ:

| ที่ | ตัวแปร |
| --- | --- |
| เว็บ (Vercel) | `DATABASE_URL`, `AUTH_SECRET`, `AI_SERVICE_URL`, `AI_SERVICE_API_KEY`, `NEXT_PUBLIC_APP_URL`, `APP_ENV=hosted`, `BLOB_READ_WRITE_TOKEN`, ค่า Google (ถ้าใช้) |
| AI (Render) | `AI_SERVICE_API_KEY` (ค่าเดียวกับเว็บ) |

`AI_SERVICE_API_KEY` ต้องตรงกันทั้งสองฝั่ง เพราะเว็บใช้เรียก AI และ AI ใช้โหลดไฟล์โมเดลจากเว็บ

รายละเอียดเพิ่มเติม: [dev-docs/system-context.md](../dev-docs/system-context.md)

[↑ สารบัญ](#toc)
