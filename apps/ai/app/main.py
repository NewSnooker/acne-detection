from fastapi import FastAPI, Form, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
import os
import shutil
import time
import uuid
import urllib.request
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.error import URLError

from app.config import settings
from app.services.yolo_service import YoloService

# เวลารอสูงสุดตอนดาวน์โหลดรูป/โมเดล (วินาที)
DOWNLOAD_TIMEOUT = 120

# ─── API Key Auth (Next.js เท่านั้นที่เรียกได้) ────────────
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.AI_SERVICE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    os.makedirs(settings.MODELS_PATH, exist_ok=True)
    yield


app = FastAPI(
    title="Acne AI Service",
    version="1.0.0",
    description="YOLO Local Inference Service — Internal use only",
    docs_url="/docs" if os.getenv("DEBUG", "false").lower() == "true" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def get_local_path(url_or_path: str, is_model: bool = False) -> str:
    """
    คืน path ของไฟล์บนดิสก์
    - ถ้าเป็น URL: ดาวน์โหลดมาเก็บก่อน (โมเดลเก็บเป็น cache, รูปเก็บชั่วคราว)
    - ถ้าเป็น path: ใช้ตามนั้น
    """
    if not (url_or_path.startswith("http://") or url_or_path.startswith("https://")):
        return url_or_path

    filename = url_or_path.split("/")[-1] or f"temp_{uuid.uuid4().hex}"
    if "?" in filename:
        filename = filename.split("?")[0]

    # โมเดลเก็บใน MODELS_PATH (cache) ส่วนรูปเก็บใน STORAGE_PATH (ชั่วคราว)
    target_dir = settings.MODELS_PATH if is_model else settings.STORAGE_PATH

    if is_model and not filename.lower().endswith(".pt"):
        filename += ".pt"

    local_path = os.path.join(target_dir, filename)

    if is_model and os.path.exists(local_path):
        return local_path  # Cache hit

    headers = {"User-Agent": "Mozilla/5.0"}
    if is_model:
        # ไฟล์โมเดลฝั่ง Next.js (GET /api/models/{id}) ต้องยืนยันด้วย key เดียวกัน
        # ส่ง key เฉพาะตอนโหลดโมเดล ไม่ส่งไปกับ URL ของรูป
        headers["X-API-Key"] = settings.AI_SERVICE_API_KEY

    # โหลดลงไฟล์ชั่วคราวก่อน แล้วค่อยย้าย กันไฟล์ครึ่ง ๆ กลาง ๆ ค้างเป็น cache
    temp_path = f"{local_path}.{uuid.uuid4().hex}.tmp"
    try:
        req = urllib.request.Request(url_or_path, headers=headers)
        with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT) as response, open(temp_path, "wb") as out_file:
            shutil.copyfileobj(response, out_file)
        os.replace(temp_path, local_path)
        return local_path
    except (URLError, TimeoutError) as e:
        raise HTTPException(status_code=400, detail=f"Failed to download {url_or_path}: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "acne-ai"}


@app.post("/predict", tags=["Inference"])
async def predict(
    image_url_or_path: str = Form(..., description="URL หรือ Absolute path ของรูป"),
    model_url_or_path: str = Form(..., description="URL หรือ Absolute path ของไฟล์ .pt"),
    confidence: float = Form(0.20),
    _: str = Security(verify_api_key),
):
    """
    รับ path หรือ URL รูปและโมเดล → รัน YOLO → return detections JSON
    """
    t0 = time.time()
    local_image_path = get_local_path(image_url_or_path, is_model=False)
    t_img = time.time() - t0

    t1 = time.time()
    local_model_path = get_local_path(model_url_or_path, is_model=True)
    t_model = time.time() - t1

    if not Path(local_image_path).exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {local_image_path}")
    if not Path(local_model_path).exists():
        raise HTTPException(status_code=404, detail=f"Model not found: {local_model_path}")

    try:
        t2 = time.time()
        service = YoloService()
        result = service.predict(local_image_path, local_model_path, confidence)
        t_infer = time.time() - t2

        total_time = time.time() - t0
        print(f"[FastAPI Timing] Image: {t_img:.2f}s | Model: {t_model:.2f}s | YOLO Inference: {t_infer:.2f}s | Total AI Time: {total_time:.2f}s")
        return result
    finally:
        # Cleanup temp image if it was downloaded from URL
        if image_url_or_path.startswith("http") and os.path.exists(local_image_path):
            try:
                os.remove(local_image_path)
            except OSError:
                pass
