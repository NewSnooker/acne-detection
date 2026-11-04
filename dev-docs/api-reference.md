# API Reference

## Next.js Route Handlers (`apps/web/src/app/api`)

| Method | Path | สิทธิ์ (ตามโค้ดจริง) | Body | Logic |
|---|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | public | — | Auth.js handlers |
| POST | `/api/account/register` | public | JSON `{name,email,password,confirmPassword}` | `registerUserLogic` |
| POST | `/api/analyze` | login | multipart `image` | upload → FastAPI → severity → บันทึก |
| DELETE | `/api/analyze/history` | ADMIN | JSON `{id}` หรือ `{ids:[]}` | `deleteHistories` (ไม่พบตอบ 404) |
| GET | `/api/images/[...path]` | login + เป็นเจ้าของรูป (หรือ ADMIN) | — | อ่านไฟล์จากดิสก์ (รูปคนอื่นตอบ 404, cache แบบ private) |
| GET | `/api/models/[id]` | header `X-API-Key` (= `AI_SERVICE_API_KEY`) หรือ ADMIN | — | ส่งไฟล์ `.pt` (FastAPI เรียก — ห้ามเปลี่ยน path) โมเดลแบบ `file` ที่เครื่องนี้ไม่มีไฟล์ตอบ 409 |
| PATCH | `/api/models/[id]` | ADMIN | JSON `{name,version,description?,mAP50?,precision?,recall?,f1Score?,accuracy?,confidence?,useTta?}` | แก้ข้อมูล ค่าประเมิน ความมั่นใจขั้นต่ำ (0.05–0.95, นอกช่วงตอบ 400) และ TTA |
| DELETE | `/api/models/[id]` | ADMIN | — | ลบโมเดล (โมเดลหลักตอบ 409) |
| POST | `/api/models/[id]/activate` | ADMIN | — | ตั้งเป็นโมเดลหลัก (ไม่พบตอบ 404) |
| POST | `/api/models/[id]/metrics` | ADMIN | — | ให้ FastAPI อ่าน mAP50/precision/recall/f1Score จากไฟล์ `.pt` แล้วบันทึก คืน `{metrics}` (ไม่มีผลเทรน 422, AI ล่ม 502) |
| POST | `/api/models?fileName&name&version&description` | ADMIN | เนื้อไฟล์ `.pt` ตรง ๆ (ไม่ใช่ multipart) | อัปโหลดตาม `MODEL_STORAGE` ตอบ 201 (เกินเพดาน `mongodb` ตอบ 413) |
| DELETE | `/api/models` | ADMIN | JSON `{ids:[]}` | ลบกลุ่ม (ข้ามตัว active) คืน `count` |
| DELETE | `/api/users/[id]` | ADMIN | — | ลบผู้ใช้ + รูป + ประวัติ (ลบตัวเอง 400, ลบแอดมิน 403, ไม่พบ 404) |
| DELETE | `/api/users` | ADMIN | JSON `{ids:[]}` | ลบกลุ่ม ข้ามตัวเองและแอดมิน คืน `count` |

รูปแบบ response: สำเร็จ `{ success: true, ... }` / ผิดพลาด `{ error: "ข้อความไทย" }`
ไม่ผ่านสิทธิ์: 401 เมื่อยังไม่ login, 403 เมื่อ role ไม่ถึง (ตรวจด้วย `lib/auth/guards.ts`)
body ผิดรูปแบบ: 400 (ตรวจด้วย zod ผ่าน `parseBody` ใน `lib/http-error.ts`), ไม่พบ: 404, ขัดกับสถานะ (เช่นลบโมเดลหลัก, อีเมลซ้ำ): 409
error ที่ไม่ได้ตั้งใจตอบ 500 พร้อมข้อความกลางๆ — รายละเอียดอยู่ใน log ของเซิร์ฟเวอร์เท่านั้น

การอ่านข้อมูล (list ผู้ใช้/โมเดล/ประวัติ/สถิติ) **ไม่มี API** — server component เรียก `src/server/<feature>.ts` ตรง

### Server Actions (`app/actions/auth-actions.ts`)

| ชื่อ | ใช้ที่ |
|---|---|
| `loginWithCredentials(formData)` | `login-form.tsx` |
| `loginWithGoogle()` | `login-form.tsx` (`<form action>`) — ถ้าไม่มี env ของ Google จะ redirect ไป `/login?error=GoogleNotConfigured` |
| `registerUser(formData)` | ไม่ถูกใช้ (ซ้ำกับ `/api/account/register`) |

### Client fetch wrappers (`src/lib/api-client`)

`AnalyzeService.analyzeImage / deleteHistories`, `AuthService.register`,
`ModelService.uploadModel / toggleModelActive / deleteModel / deleteModels / editModel`, `UserService.deleteUser / deleteUsers`
ทุกตัวคืน `{ success?, error?, ... }` ไม่ throw

## FastAPI (`apps/ai/app/main.py`)

| Method | Path | Auth | ใช้งานจริง | รายละเอียด |
|---|---|---|---|---|
| GET | `/` | — | ตัวตรวจสถานะของ Render / เปิด URL ตรง | `{status:"ok"}` |
| GET | `/health` | — | ใช้ ping | `{status:"ok"}` |
| POST | `/predict` | `X-API-Key` | **ใช่** | form: `image_url_or_path`, `model_url_or_path`, `confidence` (เว็บส่งตาม `AiModel.confidence`, ไม่ส่ง = 0.2), `augment` (TTA, ไม่ส่ง = false — เว็บส่งตาม `AiModel.useTta`) · header `X-Request-ID` (ไม่บังคับ ใช้จับคู่ log) → ตอบ header `Server-Timing` (เวลาแต่ละขั้น ms) + `X-Request-ID` |
| POST | `/model-metrics` | `X-API-Key` | ใช่ (หลังอัปโหลด/ปุ่มดึงค่า) | form: `model_url_or_path` → `{metrics:{mAP50,precision,recall,f1Score}}` เป็นร้อยละ จาก `checkpoint["train_metrics"]` (ไม่มีข้อมูล = `{}`) |
| GET | `/docs` | — | เปิดเมื่อ `DEBUG=true` | Swagger |

### Response ของ `/predict`

```json
{
  "detections": [
    { "type": "papule", "confidence": 0.8123, "bbox": { "x1": 10.5, "y1": 20.0, "x2": 40.2, "y2": 55.1 } }
  ],
  "counts": { "blackhead": 0, "cyst": 0, "nodule": 0, "papule": 1, "pustule": 0, "whitehead": 0 },
  "total": 1
}
```

bbox เป็นพิกัด pixel ของรูปต้นฉบับ (xyxy)
