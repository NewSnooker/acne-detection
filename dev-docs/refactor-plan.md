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
| 7 Docker | แก้บางส่วน — มี `.dockerignore`, เอา `--reload` ออก; ยังใช้ `npm install` และ `--accept-data-loss` (เหตุผลใน architecture.md) |
| 15 เช็คสิทธิ์ซ้ำ | แก้แล้ว — รวมไว้ที่ `lib/auth/guards.ts` ทุกหน้าและทุก route ใช้ชุดเดียวกัน แยก 401 กับ 403 |
| 25 โค้ดที่ไม่ได้ใช้ | ลบแล้ว — ไฟล์ ฟังก์ชัน package และตัวแปร env ที่ไม่มีใครเรียก |
| 27 test | ทำแล้วเฉพาะฟีเจอร์สำคัญ — เว็บ 164 กรณี (Vitest), AI 37 กรณี (pytest) ดู `testing.md` |
| 28 `.gitattributes` | เพิ่มแล้ว |
| 29 CI, prettier, typecheck | ทำแล้ว (2026-10-30) — `.github/workflows/ci.yml`, prettier + `prettier-plugin-tailwindcss`, commit จัดรูปแบบอยู่ใน `.git-blame-ignore-revs` |
| 31 `.env.example` ไม่ตรงโค้ด | แก้แล้ว (`APP_ENV=hosted`) |
| 32 แอดมินคนแรก | ใน Docker ใช้ seed แล้ว; โหมด dev ยังใช้กฎ "คนแรกที่สมัครเป็น ADMIN" |
| 8, 9, 24 | แก้แล้ว (2026-10-19) — ค่าประเมินโมเดลให้แอดมินกรอก, การ์ดคำแนะนำองค์รวมในหน้า `/analyze`, เปิด `/` และ `/knowledge` เป็นหน้าสาธารณะ |
| ใหม่ | อัปโหลดไฟล์ใหญ่กว่า 10 MB ผ่าน route ที่มี `proxy.ts` จะถูกตัด (ค่า default ของ `experimental.proxyClientMaxBodySize`) — กระทบการอัปโหลดโมเดลขนาดใหญ่ |

---

## P0 — ความปลอดภัย (ทำก่อนรีแฟกเตอร์)

| # | ปัญหา | ที่ไหน | แก้อย่างไร |
|---|---|---|---|
| 1 | **API key จริงถูก hard-code เป็น fallback และ commit ขึ้น GitHub แล้ว** (ค่าตรงกับ `.env` ทั้งสองฝั่ง) | `lib/services/analyze-logic.ts` บรรทัด `apiKey = process.env.AI_SERVICE_API_KEY \|\| "1juc+..."` | สร้าง key ใหม่ทั้ง web/ai/Render/Vercel, ลบ fallback, ถ้า env ไม่มีให้ throw ตอน start (ทำ `lib/env.ts` validate ด้วย zod) |
| 2 | ดาวน์โหลดไฟล์โมเดลได้โดยไม่ต้อง login | `proxy.ts` ใส่ `/api/models` ทั้ง prefix ใน `PUBLIC_ROUTES` + `GET /api/models/[id]` ไม่เช็คอะไร | ให้ FastAPI ส่ง `X-API-Key` ตอนโหลดโมเดล แล้ว route เช็ค key (หรือ session admin) |
| 3 | FastAPI มี endpoint เก่าที่ไม่ได้ใช้และไม่ปลอดภัย | `/ws/predict` (ไม่มี auth), `/models/upload`, `DELETE /models/{filename}` (path traversal) | ลบทิ้ง |
| 4 | `/predict` รับ path/URL อะไรก็ได้ | `main.py get_local_path` | จำกัด path ให้อยู่ใต้ `STORAGE_PATH`, จำกัด host ของ URL, ใส่ timeout |
| 5 | ไม่ตรวจไฟล์อัปโหลดฝั่ง server | `/api/analyze` (ชนิด/ขนาด/นามสกุลมาจากชื่อไฟล์ผู้ใช้), `/api/models/create` (ขนาด) | ตรวจ MIME + magic bytes ให้เหลือ JPEG/PNG ตามเล่ม, จำกัดขนาด, กำหนดนามสกุลเอง |
| 6 | รูปของผู้ใช้คนอื่นเปิดได้ถ้ารู้ชื่อไฟล์ และเช็ค path ด้วย `startsWith` ไม่มีตัวคั่น | `/api/images/[...path]` | เช็คว่าเป็นเจ้าของรูปหรือ admin, ใช้ `path.relative` |
| 7 | Docker image ติด `.env` และ `venv` เข้าไป (ไม่มี `.dockerignore`), web รัน `prisma db push --accept-data-loss` ทุกครั้ง, ai รัน `--reload` | `apps/*/Dockerfile` | เพิ่ม `.dockerignore`, `npm ci`, multi-stage, เอา `--accept-data-loss` และ `--reload` ออกจาก image จริง |

## P1 — ยังไม่ตรงขอบเขตในเล่ม (ดู scope-traceability.md)

| # | ข้อ | สิ่งที่ต้องทำ |
|---|---|---|
| 8 | 1.3.3.3 | เพิ่ม field ค่าประเมินใน `AiModel` (precision, recall, f1, mAP50, mAP50-95) + แสดงในหน้า `/admin/models` — อ่านจาก `.pt` ฝั่ง FastAPI ตอนอัปโหลด หรือให้ admin กรอก |
| 9 | 1.3.3.4 | เพิ่มขั้นตอน/การ์ดคำแนะนำองค์รวม (นอน, เครียด, อาหาร) ในหน้า `/analyze` ก่อนกดวิเคราะห์ |
| 10 | 1.3.3.2 | label ภาษาไทย + logic ปรับตำแหน่ง/ซ่อน label เมื่อชิดขอบบนหรือกรอบเล็กมาก |
| 11 | 1.3.2.3 | จำกัด `accept="image/jpeg,image/png"` และตรวจฝั่ง server (ข้อ 5) |
| 12 | 1.4.1 | เพิ่ม disclaimer "ไม่ทดแทนการวินิจฉัยของแพทย์" ในหน้าผลลัพธ์ |
| 13 | 1.5.2.5 | ตรวจว่าโมเดลที่ใช้เป็น YOLO26 จริง และอัปเดต `ultralytics` ให้รองรับ |

## P2 — โครงสร้าง

| # | ปัญหา | ข้อเสนอ |
|---|---|---|
| 14 | ชื่อชั้นสับสน: `src/services` (client fetch) vs `src/lib/services` (server) และมีไฟล์ชื่อซ้ำ (`model-service.ts`, `user-service.ts`), `*-logic` กับ `*-service` แบ่งไม่ชัด | แยกเป็น `src/server/<feature>/` (ใส่ `import "server-only"`) กับ `src/lib/api-client/` หรือจัดแบบ feature folder: `features/{analyze,history,models,users,statistics}/` |
| 15 | เช็ค auth ซ้ำทุก route (copy 6 บรรทัด 8 ที่) และหน้า admin เช็คไม่เหมือนกัน (บางหน้าใช้ `requireAdminRoute` บางหน้าเขียนเอง) | ทำ helper `requireAdminApi()` / wrapper `withAdmin(handler)` และใช้ guard เดียวกันทุกหน้า, แยก 401 (ไม่ login) กับ 403 (สิทธิ์ไม่ถึง) |
| 16 | โค้ดซ้ำ: `getUserHistory`/`getAllHistory` เหมือนกัน ~90%, `deleteUserLogic`/`deleteUsersLogic`, `deleteModelLogic`/`deleteModelsLogic` | รวมเป็นฟังก์ชันเดียวรับ option / ให้ตัวเดี่ยวเรียกตัวกลุ่ม |
| 17 | ดึงข้อมูลทั้งหมดมา filter/แบ่งหน้าใน memory (`fetchLimit = 10000`, รวม `detections` ทุกแถว), สถิติวนคำนวณใน JS | filter + `skip/take` ใน Prisma, `select` เฉพาะ field ที่ใช้, เก็บ count ต่อชนิดเป็น field แยกหรือใช้ aggregate, เพิ่ม index `userId`, `createdAt` |
| 18 | REST ไม่สม่ำเสมอ: `POST /api/models/create`, `PUT /api/models/[id]/edit`, `PUT /api/models/[id]` = ตั้ง active, `DELETE` มี body | `POST /api/models`, `PATCH /api/models/[id]`, `POST /api/models/[id]/activate`, ไม่มี validate body → ใช้ zod ทุก route |
| 19 | โมเดลเก็บใน `Bytes` ของ MongoDB → ติดเพดานเอกสาร 16 MB แต่ UI ให้ถึง 100 MB และโหลดทั้งไฟล์เข้า RAM | ใช้ GridFS หรือ Vercel Blob แล้วเก็บแค่ URL; ลบ field `filePath`/`provider` ที่ไม่ใช้ |
| 20 | `setActiveModelLogic` ทำ 2 คำสั่งไม่อยู่ใน transaction, `DELETE /api/models/[id]` ลบตัว active ได้ | ใช้ `prisma.$transaction`, กันลบตัว active ให้เหมือน batch |
| 21 | ถ้า FastAPI ล้ม รูปที่อัปโหลดไปแล้วค้างบนดิสก์/Blob | ลบรูปใน `catch` หรืออัปโหลดหลัง predict สำเร็จ |
| 22 | ลำดับคลาส hard-code ใน Python, confidence มี 3 ค่า (0.20/0.40/0.25), `ACCURACY_THRESHOLD` ประกาศ 2 ที่ | อ่านจาก `model.names`, เหลือค่า default ที่เดียว |
| 23 | FastAPI อยู่ไฟล์เดียว, ดาวน์โหลดแบบ blocking ใน `async def`, ใช้ `print`, อ่าน `DEBUG` ด้วย `os.getenv` แทน `settings`, ไม่มี response model | แยก `routers/`, `schemas/`, ใช้ `def` หรือ `httpx`, `logging`, Pydantic response model |
| 24 | หน้า `/` เป็น landing แต่ `proxy.ts` ไม่ปล่อย → คนไม่ login ไม่เคยเห็น; matcher ยังยกเว้น `storage/` ที่ไม่มีแล้ว | ใส่ `/` ใน public หรือเลิกทำ landing |

## P3 — คุณภาพโค้ดและเครื่องมือ

| # | ปัญหา | ข้อเสนอ |
|---|---|---|
| 25 | โค้ด/ของที่ไม่ได้ใช้ | ลบ: `/api/account/login`, `registerUser` action, `getUsers`, `getActiveModel`, `getUserAnalytics`, `requireAuthRoute`, `formatPercent`, `capitalize`, `components/ui/chart.tsx`, `ui/separator.tsx`, `scratch.ts`, `scratch_update.ts`, `__pycache__/` ที่ root; deps: `cloudinary`, `recharts`, `uuid`, `@types/uuid`, radix `avatar/tabs/toast/progress`; env: `NEXT_PUBLIC_AI_WS_URL`, `NEXT_PUBLIC_STORAGE_URL`, `MODELS_PATH` (ฝั่ง web) |
| 26 | TypeScript หลวม: `noImplicitAny: false`, ปิด rule `no-explicit-any`, `any` ~74 จุด, severity/role เป็น string แทน enum ของ Prisma | เปิด strict เต็ม, ใช้ type จาก `@prisma/client`, แยกค่าคงที่ออกจาก `types/analyze.ts` ไป `constants/acne.ts` |
| 27 | ไม่มี test เลย | เริ่มที่ unit test `calculateSeverity` (ค่าขอบ 5/6, 20/21, deep=1) — ใช้อ้างในบททดสอบของเล่มได้ด้วย; ฝั่ง Python ทดสอบ `/predict` ด้วย `TestClient` |
| 28 | ไม่มี `.gitattributes` — ไฟล์ในเครื่องเป็น CRLF แต่ใน repo เป็น LF; บน Windows ที่ตั้ง `core.autocrlf` ไว้จะไม่เห็นปัญหา แต่เครื่องมือที่รันบน Linux (Docker, CI, Claude) จะเห็น 20 ไฟล์เป็น modified ทั้งไฟล์ | เพิ่ม `* text=auto eol=lf` แล้ว renormalize ครั้งเดียว |
| 29 | ไม่มี CI, prettier, script `typecheck` | GitHub Actions: lint + typecheck + test; เพิ่ม prettier |
| 30 | UI: `alert()` 12 จุด, modal เขียนเองทั้งที่มี Radix Dialog, progress ปลอม, `console.log` ค้าง | ใช้ toast (sonner) + Dialog, ลบ log |
| 31 | เอกสารไม่ตรงโค้ด: `.env.example` เขียน `APP_ENV=host` แต่โค้ดเช็ค `"hosted"`, comment ใน schema ยังพูดถึง cloudinary, README บอก 12 endpoint | แก้ให้ตรง, ย้ายเนื้อหา README มาอ้าง `dev-docs` |
| 32 | ผู้ใช้คนแรกเป็น ADMIN อัตโนมัติ (นับแล้วค่อยสร้าง มีช่อง race) และสมัครด้วย Google คนแรกจะไม่ได้ ADMIN | ใช้ seed script หรือ env `ADMIN_EMAILS` |
| 33 | `prisma` อยู่ใน dependencies, `@types/bcryptjs` ไม่จำเป็น (bcryptjs 3 มี type ในตัว), `torch` ไม่ pin | ย้าย/ลบ/pin |

---

## ลำดับที่แนะนำ

1. P0 ข้อ 1–2 (หมุน key + ปิด endpoint โมเดล) — ทำทันที แยก commit
2. เพิ่ม `.gitattributes` (ข้อ 28) ก่อนเริ่ม เพื่อให้ diff ตอนรีแฟกเตอร์อ่านได้
3. เขียน test `calculateSeverity` (ข้อ 27) เป็นตาข่ายกันพัง
4. ลบโค้ดตาย (ข้อ 3, 25) — โค้ดลดลงก่อนย้ายโครงสร้าง
5. จัดโครงสร้างใหม่ (ข้อ 14–16, 18) ทีละ feature: models → users → history → analyze
6. เติมของที่ขาดตามเล่ม (P1)
7. performance + ที่เหลือ (ข้อ 17, 19–24)
