# AI Service (apps/ai)

FastAPI 0.115.5 · Ultralytics 8.3.40 · PyTorch · Python 3.12 (Docker) / venv (Windows)

## ไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `app/main.py` | สร้าง app, CORS, API key, endpoint ทั้งหมด (`/health`, `/predict`) และ `get_local_path()` |
| `app/services/yolo_service.py` | `ACNE_CLASSES`, cache โมเดลใน memory (`_cache` + lock), `YoloService.predict()` |
| `app/config.py` | `Settings` (pydantic-settings): `AI_SERVICE_API_KEY`, `STORAGE_PATH`, `MODELS_PATH`, `DEBUG` |
| `inspect_pt.py` | สคริปต์ดูข้างในไฟล์ `.pt` (keys, results_dict, names) — ไม่ได้อยู่ใน flow |
| `requirements.txt` | pin เวอร์ชัน (ไม่มี torch — ติดมากับ ultralytics) |
| `Dockerfile` | python:3.12-slim, ติดตั้ง PyTorch รุ่น CPU ก่อน `requirements.txt` |
| `models/` | cache ไฟล์ `.pt` ที่โหลดจาก Next.js (ชื่อ `<AiModel.id>.pt`) |
| `storage/` | ไฟล์รูปชั่วคราวที่โหลดจาก URL |

## การทำงานของ `/predict`

1. ตรวจ `X-API-Key` เทียบ `settings.AI_SERVICE_API_KEY`
2. `get_local_path()`:
   - ถ้า input ขึ้นต้น `http(s)://` → ดาวน์โหลดด้วย `urllib` (timeout 120 วินาที, โหลดลงไฟล์ `.tmp` แล้วค่อยย้าย) — ตอนโหลดโมเดลจะส่ง header `X-API-Key` ไปด้วย
     - โมเดล: เซฟที่ `MODELS_PATH/<ชื่อท้าย URL>.pt` ถ้ามีไฟล์แล้วข้าม (cache hit)
     - รูป: เซฟที่ `STORAGE_PATH/<ชื่อท้าย URL>` แล้วลบใน `finally`
   - ถ้าไม่ใช่ URL → ใช้เป็น path บนดิสก์ตรง ๆ
3. `YoloService().predict(image_path, model_path, confidence)`
4. print เวลาแต่ละขั้น

## yolo_service.py

```python
ACNE_CLASSES = {0:"blackhead", 1:"cyst", 2:"nodule", 3:"papule", 4:"pustule", 5:"whitehead"}
```

- เรียงตามตัวอักษร (ลำดับที่ Roboflow export) — **hard-code** ไม่ได้อ่านจาก `model.names`
- `torch.set_num_threads(min(2, cpu_count))` กัน CPU throttling ใน container
- cache โมเดลตาม path ไม่มีการล้างเมื่อโมเดลถูกลบ/เปลี่ยนจากฝั่ง web
- ไม่ได้กำหนด `imgsz`, `iou`, `device` → ใช้ค่า default ของ Ultralytics

## ค่า confidence (มี 3 ที่ ไม่ตรงกัน)

| ที่ | ค่า |
|---|---|
| `YoloService.predict` default | 0.40 |
| `/predict` form default | 0.20 |
| Next.js ส่งมาจริง (`AI_CONFIDENCE_THRESHOLD` หรือ default) | 0.25 |

ค่าที่มีผลจริงคือ 0.25 จากฝั่ง Next.js

## Environment (apps/ai/.env)

`AI_SERVICE_API_KEY` (ต้องตรงกับฝั่ง web), `DEBUG`, `STORAGE_PATH`, `MODELS_PATH`

## รัน

```bash
cd apps\ai
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Hosted บน Render free tier จะ sleep หลัง 15 นาที → ใช้ cron ping `/health`
