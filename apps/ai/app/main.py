from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
import os
import uuid
import shutil
from pathlib import Path
from contextlib import asynccontextmanager

from app.config import settings
from app.services.yolo_service import YoloService

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


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "acne-ai"}


@app.post("/predict", tags=["Inference"])
async def predict(
    image_path: str = Form(..., description="Absolute path ของรูปในระบบ"),
    model_path: str = Form(..., description="Absolute path ของไฟล์ .pt"),
    confidence: float = Form(0.20),
    _: str = Security(verify_api_key),
):
    """
    รับ path รูปและ path โมเดล → รัน YOLO → return detections JSON
    Next.js เป็นคนส่งมา ไม่รับ upload ตรงจาก browser
    """
    if not Path(image_path).exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {image_path}")
    if not Path(model_path).exists():
        raise HTTPException(status_code=404, detail=f"Model not found: {model_path}")

    service = YoloService()
    result = service.predict(image_path, model_path, confidence)
    return result


@app.post("/models/upload", tags=["Models"])
async def upload_model(
    file: UploadFile = File(...),
    _: str = Security(verify_api_key),
):
    """
    Admin อัปโหลด .pt ผ่าน Next.js → Next.js forward มาที่นี่
    บันทึกไฟล์ลง MODELS_PATH และ return path
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext != ".pt":
        raise HTTPException(status_code=422, detail="Only .pt files allowed")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(settings.MODELS_PATH, filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    size_mb = round(Path(file_path).stat().st_size / (1024 * 1024), 2)
    return {"file_path": file_path, "file_name": filename, "size_mb": size_mb}


@app.delete("/models/{filename}", tags=["Models"])
async def delete_model(filename: str, _: str = Security(verify_api_key)):
    """ลบไฟล์ .pt และ clear cache"""
    file_path = os.path.join(settings.MODELS_PATH, filename)
    if not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="Model file not found")

    from app.services.yolo_service import clear_cache
    clear_cache(file_path)
    os.remove(file_path)
    return {"deleted": filename}
