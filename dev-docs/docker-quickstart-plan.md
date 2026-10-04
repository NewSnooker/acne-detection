# แผน: โหลดแล้วเปิด Docker ใช้ได้เลย

**โจทย์:** คนอื่น clone repo → `docker compose up --build` → เปิด `http://localhost:3000` → login → วิเคราะห์รูปได้ โดยไม่ต้องตั้งค่าอะไรเพิ่ม

ตรวจจากโค้ด ณ commit `321ab0e` (2026-10-04) โดยอ่านโค้ด ยังไม่ได้ทดสอบบน clone ใหม่จริง


## สถานะ (2026-10-04)

ทำครบทุกขั้นและรวมเข้า `main` แล้ว **ทดสอบด้วย Docker จริงผ่านแล้ว** (เจ้าของโปรเจคเป็นผู้ทดสอบ)

| รายการทดสอบ | ผล |
|---|---|
| รันได้โดยไม่มีไฟล์ `.env` | ผ่าน |
| seed สร้างแอดมินและโมเดลเริ่มต้นบนฐานข้อมูลว่าง | ผ่าน |
| เปิดซ้ำแล้วไม่สร้างข้อมูลซ้ำ | ผ่าน |
| login และวิเคราะห์รูป | ผ่าน |
| ปุ่ม Google แจ้งเตือนเมื่อไม่มี env | ผ่าน |

เพิ่มหลังแผนเดิม: เปิด port ของ MongoDB ให้เฉพาะเครื่องนี้ (`127.0.0.1`, เปลี่ยนได้ด้วย `MONGO_PORT`), ตั้งชื่อ volume `mongodb_config`, ลด log ของ MongoDB

สิ่งที่ทำต่างจากแผนด้านล่าง:

| แผน | ที่ทำจริง | เหตุผล |
|---|---|---|
| ลบ `env_file` | เหลือ `apps/web/.env` เป็นไฟล์ไม่บังคับ (`required: false`) | ใช้ใส่ `GOOGLE_CLIENT_ID/SECRET` และไม่ทำให้การตั้งค่าเดิมของเจ้าของโปรเจคหาย |
| named volume สำหรับรูป/โมเดล | ใช้ bind mount `apps/images`, `apps/ai/models` เหมือนเดิม | รูปและ cache เดิมยังใช้ได้ |
| `docker-entrypoint.sh` | เขียนคำสั่งไว้ใน `CMD` ของ Dockerfile | ไม่เสี่ยงเรื่องไฟล์ `.sh` เป็น CRLF |
| `npm ci` | ยังใช้ `npm install` | lock file สร้างบน Windows ถ้าใช้ `npm ci` บน Linux อาจขาดแพ็กเกจเฉพาะแพลตฟอร์ม |
| เอา `--accept-data-loss` ออก | ยังคงไว้ | ถ้า Prisma เตือนเรื่อง index แล้วไม่มี flag นี้ container จะเริ่มไม่ได้ |
| เลิกกฎ "คนแรกที่สมัครเป็น ADMIN" | ยังคงไว้ | โหมด dev (ไม่ใช้ Docker) ยังต้องใช้กฎนี้ |

---

## 1. ตอนนี้ clone ใหม่แล้วจะติดตรงไหน

| # | ระดับ | อาการ | สาเหตุ |
|---|---|---|---|
| 1 | บล็อก | `docker compose up` error ทันที | `docker-compose.yml` ใช้ `env_file: ./apps/web/.env` และ `./apps/ai/.env` แต่ `.env` ถูก gitignore จึงไม่มีในเครื่องคนโหลด |
| 2 | บล็อก | วิเคราะห์รูปแล้วขึ้น "การประมวลผลรูปภาพขัดข้องที่ระบบ AI" | API key สองฝั่งไม่ตรงกันทุกกรณีของคนโหลดใหม่: ถ้า copy `.env.example` → web ได้ `your-api-key` แต่ ai ได้ `change-me-strong-random-secret`; ถ้าไม่มี `.env` เลย → web ใช้ fallback ในโค้ด แต่ ai ใช้ default `change-me-strong-secret` ใน `config.py` |
| 3 | บล็อก | หน้า `/analyze` ขึ้น "ระบบไม่พร้อมใช้งาน ไม่มีโมเดล" | ฐานข้อมูลใหม่ว่างเปล่า และไฟล์ `.pt` ถูก gitignore ไม่ได้อยู่ใน repo คนโหลดจึงไม่มีโมเดลให้อัปโหลด |
| 4 | บล็อก | กด "Google" แล้วเจอหน้า error ของ Google | ไม่มี `GOOGLE_CLIENT_ID/SECRET` แต่ `lib/auth.ts` ยังลงทะเบียน Google provider ด้วยค่า undefined |
| 5 | เสี่ยง | web container ล้มรอบแรกแล้ว restart เอง | `mongo-setup` ใช้ `sleep 3` แล้วค่อย `rs.initiate` ส่วน web `depends_on` แบบไม่รอ healthy → `prisma db push` อาจรันก่อน replica set พร้อม |
| 6 | เสี่ยง | build ช้ามาก image ใหญ่หลาย GB | `pip install ultralytics` ดึง PyTorch รุ่น CUDA มาทั้งชุด ทั้งที่รันบน CPU |
| 7 | เสี่ยง | port ชนกับของที่เครื่องผู้ใช้มีอยู่ | เปิด `27017` และ `8000` ออก host ทั้งที่มีแค่ `3000` ที่ผู้ใช้ต้องเข้า |
| 8 | เสี่ยง | ข้อมูลหาย / โค้ดใน image ไม่ถูกใช้ | web รัน `prisma db push --accept-data-loss` ทุกครั้ง; ai mount `./apps/ai:/app` ทับ image และรัน `--reload` |
| 9 | เสี่ยง | secret ติดเข้า image | ไม่มี `.dockerignore` → `COPY . .` เอา `.env`, `node_modules`, `venv` เข้าไปด้วย |
| 10 | ต้องตรวจ | อัปโหลดโมเดลใหญ่กว่า ~10 MB ไม่ผ่าน | Next 16 จำกัดขนาด body เมื่อผ่าน `proxy.ts` (ค่า default ประมาณ 10 MB) — โมเดลปัจจุบัน 5.4 MB ยังผ่าน |
| 11 | ขาด | คนโหลดไม่รู้ต้องทำอะไร | README ไม่มีขั้นตอน Docker และไม่มีบัญชีเริ่มต้น |

### เรื่อง API key ที่ hard-code

เข้าใจแล้วว่าตั้งใจใส่ไว้ให้ Docker ใช้ได้เลย แต่ตามข้อ 2 ค่า fallback ในโค้ดฝั่ง web **ไม่ตรงกับ default ฝั่ง ai** จึงยังไม่ช่วยให้คนโหลดใหม่ใช้ได้

ข้อเสนอ: ย้ายค่า default ไปไว้ที่ `docker-compose.yml` ที่เดียว แล้วส่งให้ทั้งสอง service

```yaml
x-shared-env: &ai-key
  AI_SERVICE_API_KEY: ${AI_SERVICE_API_KEY:-acne-local-docker-key}
```

- ได้ผลตามที่ต้องการ (ใช้ได้เลยโดยไม่ต้องตั้งค่า) และสองฝั่งตรงกันแน่นอน
- โค้ด TypeScript ไม่มี key ฝัง อ่านจาก env อย่างเดียว
- port 8000 ไม่เปิดออก host จึงมีแค่ web ใน network เดียวกันที่เรียก ai ได้

---

## 2. ปุ่ม "เข้าสู่ระบบด้วย Google" (จดไว้ตามที่สั่ง)

**ที่ต้องการ:** ถ้าไม่มี env ของ Google กดปุ่มแล้วให้แจ้งเตือน ไม่ใช่พังไปหน้า error

| ไฟล์ | แก้ |
|---|---|
| `lib/auth.ts` | `const googleEnabled = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)` แล้วใส่ Google provider เฉพาะเมื่อ `googleEnabled` |
| `app/(auth)/login/page.tsx` | เป็น server component อยู่แล้ว → ส่ง prop `googleEnabled` ให้ `<LoginForm>` |
| `components/auth/login-form.tsx` | ถ้า `!googleEnabled` กดปุ่มแล้วแสดงข้อความ "ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google (ไม่พบ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) กรุณาเข้าสู่ระบบด้วยอีเมล" และไม่เรียก action |
| `app/actions/auth-actions.ts` | `loginWithGoogle` เช็คซ้ำฝั่ง server กันเรียกตรง |

### ปัญหาอื่นที่เจอในส่วน login

| # | ปัญหา | แก้ |
|---|---|---|
| a | `auth.config.ts` ตั้ง `pages.error = "/login"` แต่ฟอร์มไม่อ่าน `?error=` → Google ล้มเหลวแล้วกลับมาหน้า login เงียบ ๆ | อ่าน `searchParams.error` แล้วแสดงข้อความไทย |
| b | อีเมลที่สมัครด้วยรหัสผ่านไว้แล้ว มา login ด้วย Google อีเมลเดียวกัน → Auth.js คืน `OAuthAccountNotLinked` ไม่มีข้อความบอก | แสดง "อีเมลนี้สมัครด้วยรหัสผ่านไว้แล้ว กรุณาเข้าสู่ระบบด้วยอีเมล" |
| c | สมัครเสร็จ redirect ไป `/login?registered=true` แต่ไม่มีข้อความ "สมัครสำเร็จ" | แสดงข้อความ |
| d | ใน Docker ต้องมี `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `AUTH_URL` ไม่งั้น Auth.js error | ใส่ default ใน compose (ข้อ 3) |
| e | คนโหลดที่อยากใช้ Google ต้องสร้าง OAuth client เอง และตั้ง redirect URI `http://localhost:3000/api/auth/callback/google` | เขียนใน README |
| f | คนแรกที่เข้าด้วย Google ไม่ได้เป็น ADMIN (กฎ "คนแรกเป็น ADMIN" อยู่แค่ในฟอร์มสมัคร) | แก้ด้วย seed admin (ข้อ 3) |

---

## 3. แผนแก้

### A. docker-compose.yml ให้รันได้โดยไม่มี `.env`

- เอา `env_file` ออก ใส่ค่าทั้งหมดใน `environment:` แบบ `${VAR:-default}`
- ค่า default ที่ต้องมี: `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `AUTH_URL=http://localhost:3000`, `AI_SERVICE_API_KEY` (ใช้ร่วมสองฝั่ง), `DATABASE_URL`, `AI_SERVICE_URL`, `INTERNAL_APP_URL`, `STORAGE_PATH`
- ค่า optional (ว่างได้): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- ผู้ใช้ที่อยากเปลี่ยนค่า สร้าง `.env` ที่ root (compose อ่านเอง) จาก `.env.example`
- `mongodb`: ใส่ `healthcheck` ที่ `rs.initiate` เองถ้ายังไม่ได้ทำ แล้วลบ service `mongo-setup`
- `web`: `depends_on: mongodb: condition: service_healthy`
- เปิดออก host แค่ `3000`
- ใช้ named volume: `mongodb_data`, `images` (แชร์ web + ai), `model_cache`
- ย้ายของสำหรับ dev (mount source, `--reload`, เปิด port 8000/27017) ไป `docker-compose.dev.yml`

### B. ข้อมูลเริ่มต้น (seed) — แก้ข้อ 3 และ 2f

- เพิ่ม `apps/web/prisma/seed.mjs` รันตอน container start หลัง `prisma db push` ทำซ้ำได้ไม่สร้างซ้ำ
  - ถ้ายังไม่มี ADMIN → สร้างจาก `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (มี default ใน compose เขียนบอกใน README)
  - ถ้ายังไม่มี `AiModel` และมีไฟล์โมเดลเริ่มต้น → ใส่ลง DB ตั้ง `isActive: true`
- ไฟล์โมเดลเริ่มต้นต้องมากับ repo: `apps/web/prisma/seed/acne-default.pt` (5.4 MB) + เพิ่มข้อยกเว้นใน `.gitignore`
- เลิกกฎ "คนแรกที่สมัครเป็น ADMIN" ใน `auth-logic.ts`

### C. Dockerfile

| ไฟล์ | แก้ |
|---|---|
| `apps/web/.dockerignore`, `apps/ai/.dockerignore` | เพิ่มใหม่: `.env*`, `node_modules`, `.next`, `venv`, `__pycache__`, `models/*.pt` |
| `apps/web/Dockerfile` | `npm ci`, ใช้ `docker-entrypoint.sh` (db push แบบไม่มี `--accept-data-loss` → seed → `npm start`) |
| `apps/ai/Dockerfile` | ติดตั้ง PyTorch รุ่น CPU ก่อน (`--index-url https://download.pytorch.org/whl/cpu`), เอา `--reload` ออก |
| `.gitattributes` | `* text=auto eol=lf` — จำเป็น เพราะ `*.sh` ที่เป็น CRLF จะรันใน container ไม่ได้ |

### D. โค้ด

- `analyze-logic.ts`: เอา key ที่ฝังออก อ่านจาก env
- Google login ตามข้อ 2
- `GET /api/models/[id]`: ให้ ai ส่ง `X-API-Key` แล้ว route ตรวจ (ตอนนี้โหลดโมเดลได้โดยไม่ต้อง login)
- ลบ endpoint เก่าใน FastAPI ที่ไม่ได้ใช้

### E. เอกสาร

- `README.md`: ส่วน Quick start 3 บรรทัด + บัญชี admin เริ่มต้น + วิธีเปิด Google login
- root `.env.example`: ตัวแปรที่เปลี่ยนได้ทั้งหมดพร้อมคำอธิบาย

---

## 4. โครงสร้างไฟล์หลังแก้

```
acne-ai-v1/
├── .env.example                 ← ใหม่: ค่าที่ override ได้ (ไม่บังคับ)
├── .gitattributes               ← ใหม่
├── docker-compose.yml           ← แก้: รันได้โดยไม่มี .env
├── docker-compose.dev.yml       ← ใหม่: mount source, --reload, เปิด port เพิ่ม
├── README.md                    ← แก้: Quick start
├── apps/
│   ├── web/
│   │   ├── .dockerignore        ← ใหม่
│   │   ├── Dockerfile           ← แก้
│   │   ├── docker-entrypoint.sh ← ใหม่
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.mjs         ← ใหม่
│   │   │   └── seed/acne-default.pt  ← ใหม่ (โมเดลเริ่มต้น)
│   │   └── src/ …               ← แก้ 7 ไฟล์ (auth 5, analyze-logic, api/models/[id])
│   └── ai/
│       ├── .dockerignore        ← ใหม่
│       ├── Dockerfile           ← แก้
│       └── app/main.py          ← แก้: ส่ง key ตอนโหลดโมเดล, ลบ endpoint เก่า
```

โครงสร้างโฟลเดอร์ `apps/web` + `apps/ai` เดิมใช้ต่อได้ ไม่ต้องย้าย ปัญหาอยู่ที่ไฟล์ตั้งค่า Docker และข้อมูลเริ่มต้น ไม่ใช่การจัดโฟลเดอร์

---

## 5. ลำดับงาน

| ขั้น | งาน | ต้องเปิดเครื่อง |
|---|---|---|
| 1 | `.gitattributes` + `.dockerignore` | ใช่ |
| 2 | compose ใหม่ (A) + Dockerfile (C) | ใช่ |
| 3 | seed admin + โมเดล (B) | ใช่ + ต้องเลือกไฟล์ `.pt` |
| 4 | Google login + ข้อความหน้า login (ข้อ 2) | ใช่ |
| 5 | เอา key ออกจากโค้ด, ปิด `/api/models/[id]`, ลบ endpoint เก่า (D) | ใช่ |
| 6 | README + `.env.example` (E) | ใช่ |
| 7 | **ทดสอบรับงาน** (คุณเป็นคนรัน) | ใช่ |

### ทดสอบรับงาน (ขั้น 7)

1. `git clone` ลงโฟลเดอร์ใหม่ที่ไม่มี `.env`
2. `docker compose up --build`
3. เปิด `http://localhost:3000` → login ด้วยบัญชี admin เริ่มต้น
4. อัปโหลดรูป → ได้ผลวิเคราะห์
5. กดปุ่ม Google → เห็นข้อความแจ้งเตือน ไม่ใช่หน้า error
6. `docker compose down` แล้ว `up` อีกรอบ → ข้อมูลยังอยู่ ไม่มี admin/โมเดลซ้ำ

---

## 6. ต้องให้คุณตัดสินใจ

| # | คำถาม | ค่าที่ผมจะใช้ถ้าไม่ตอบ |
|---|---|---|
| 1 | ใส่ไฟล์โมเดล `.pt` (5.4 MB) ลง repo เลยได้ไหม และใช้ไฟล์ไหน | ใส่ลง repo ใช้โมเดลที่ active อยู่ตอนนี้ |
| 2 | บัญชี admin เริ่มต้น | `admin@acne.local` / `Admin1234` เขียนบอกใน README |
| 3 | repo จะเปิด public ไหม (ตอนนี้ private คนอื่น clone ไม่ได้) | ไม่แตะ ให้คุณตั้งเอง |
