from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
import os
import uuid
import shutil
from pathlib import Path
from contextlib import asynccontextmanager
import urllib.request
from urllib.error import URLError

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
    image_url_or_path: str = Form(..., description="URL หรือ Absolute path ของรูป"),
    model_url_or_path: str = Form(..., description="URL หรือ Absolute path ของไฟล์ .pt"),
    confidence: float = Form(0.20),
    _: str = Security(verify_api_key),
):
    """
    รับ path หรือ URL รูปและโมเดล → รัน YOLO → return detections JSON
    """
    # Helper for downloading URL
    def get_local_path(url_or_path: str, is_model: bool = False) -> str:
        if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
            filename = url_or_path.split("/")[-1] or f"temp_{uuid.uuid4().hex}"
            if "?" in filename:
                filename = filename.split("?")[0]
            
            # ถ้าเป็นโมเดล ให้เก็บใน MODELS_PATH (เพื่อเป็น Cache)
            # ถ้าเป็นรูปภาพ ให้เก็บใน STORAGE_PATH (เป็น temp)
            target_dir = settings.MODELS_PATH if is_model else settings.STORAGE_PATH
            
            if is_model and not filename.lower().endswith(".pt"):
                filename += ".pt"
                
            local_path = os.path.join(target_dir, filename)
            
            if is_model and os.path.exists(local_path):
                return local_path # Cache hit
                
            try:
                # Add a simple user-agent just in case
                req = urllib.request.Request(url_or_path, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response, open(local_path, 'wb') as out_file:
                    shutil.copyfileobj(response, out_file)
                return local_path
            except URLError as e:
                raise HTTPException(status_code=400, detail=f"Failed to download {url_or_path}: {str(e)}")
        else:
            return url_or_path

    # Get local paths
    local_image_path = get_local_path(image_url_or_path, is_model=False)
    local_model_path = get_local_path(model_url_or_path, is_model=True)

    if not Path(local_image_path).exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {local_image_path}")
    if not Path(local_model_path).exists():
        raise HTTPException(status_code=404, detail=f"Model not found: {local_model_path}")

    try:
        service = YoloService()
        result = service.predict(local_image_path, local_model_path, confidence)
        return result
    finally:
        # Cleanup temp image if it was downloaded from URL
        if image_url_or_path.startswith("http") and os.path.exists(local_image_path):
            try:
                os.remove(local_image_path)
            except:
                pass


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
