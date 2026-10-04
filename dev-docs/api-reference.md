# API Reference

## Next.js Route Handlers (`apps/web/src/app/api`)

| Method | Path | สิทธิ์ (ตามโค้ดจริง) | Body | Logic |
|---|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | public | — | Auth.js handlers |
| POST | `/api/account/register` | public | JSON `{name,email,password,confirmPassword}` | `registerUserLogic` |
| POST | `/api/account/login` | public | JSON `{email,password}` | **ไม่มีใครเรียก** (ฟอร์มใช้ Server Action) |
| POST | `/api/analyze` | login | multipart `image` | upload → FastAPI → severity → บันทึก |
| DELETE | `/api/analyze/history` | ADMIN | JSON `{id}` หรือ `{ids:[]}` | `deleteHistoryLogic` / `deleteHistoriesLogic` |
| GET | `/api/images/[...path]` | login (ผ่าน proxy) ไม่เช็คเจ้าของรูป | — | อ่านไฟล์จากดิสก์ |
| GET | `/api/models/[id]` | header `X-API-Key` (= `AI_SERVICE_API_KEY`) หรือ ADMIN | — | ส่งไฟล์ `.pt` จาก MongoDB (FastAPI เรียก) |
| PUT | `/api/models/[id]` | ADMIN | — | ตั้งเป็น active |
| DELETE | `/api/models/[id]` | ADMIN | — | ลบโมเดล (ไม่กันตัว active) |
| PUT | `/api/models/[id]/edit` | ADMIN | JSON `{name,version,description?}` | แก้ข้อมูล |
| POST | `/api/models/create` | ADMIN | multipart `file,name,version,description` | อัปโหลด `.pt` |
| DELETE | `/api/models` | ADMIN | JSON `{ids:[]}` | ลบกลุ่ม (ข้ามตัว active) |
| DELETE | `/api/users/[id]` | ADMIN | — | ลบผู้ใช้ + รูป + ประวัติ (กันลบตัวเอง) |
| DELETE | `/api/users` | ADMIN | JSON `{ids:[]}` | ลบกลุ่ม |

รูปแบบ response: สำเร็จ `{ success: true, ... }` / ผิดพลาด `{ error: "ข้อความไทย" }`
ไม่ผ่านสิทธิ์คืน 401 ทั้งกรณีไม่ login และ role ไม่ถึง

การอ่านข้อมูล (list ผู้ใช้/โมเดล/ประวัติ/สถิติ) **ไม่มี API** — server component เรียก Prisma ตรงผ่าน `lib/services/*-service.ts`

### Server Actions (`app/actions/auth-actions.ts`)

| ชื่อ | ใช้ที่ |
|---|---|
| `loginWithCredentials(formData)` | `login-form.tsx` |
| `loginWithGoogle()` | `login-form.tsx` (`<form action>`) — ถ้าไม่มี env ของ Google จะ redirect ไป `/login?error=GoogleNotConfigured` |
| `registerUser(formData)` | ไม่ถูกใช้ (ซ้ำกับ `/api/account/register`) |

### Client fetch wrappers (`src/services`)

`AnalyzeService.analyzeImage / deleteHistory / deleteHistories`, `AuthService.register`,
`ModelService.uploadModel / toggleModelActive / deleteModel / deleteModels / editModel`, `UserService.deleteUser / deleteUsers`
ทุกตัวคืน `{ success?, error?, ... }` ไม่ throw

## FastAPI (`apps/ai/app/main.py`)

| Method | Path | Auth | ใช้งานจริง | รายละเอียด |
|---|---|---|---|---|
| GET | `/health` | — | ใช้ ping | `{status:"ok"}` |
| POST | `/predict` | `X-API-Key` | **ใช่** | form: `image_url_or_path`, `model_url_or_path`, `confidence` (default 0.20) |
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
