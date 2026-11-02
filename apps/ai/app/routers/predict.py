import logging
import os
import time
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, Security

from app.config import settings
from app.schemas import PredictResponse
from app.security import verify_api_key
from app.services.model_files import resolve_image, resolve_model
from app.services.yolo_service import YoloService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Inference"])


# def (ไม่ใช่ async) — งานดาวน์โหลดและ YOLO เป็นงานหนักแบบ blocking ให้ FastAPI รันใน thread pool
@router.post("/predict", response_model=PredictResponse)
def predict(
    image_url_or_path: str = Form(..., description="URL หรือ Absolute path ของรูป"),
    model_url_or_path: str = Form(..., description="URL หรือ Absolute path ของไฟล์ .pt"),
    confidence: float | None = Form(None, description="ไม่ส่ง = ใช้ AI_CONFIDENCE_THRESHOLD"),
    augment: bool = Form(False, description="Test-Time Augmentation — เว็บส่งตามค่า useTta ของโมเดล"),
    _: str = Security(verify_api_key),
):
    """รับ path หรือ URL รูปและโมเดล → รัน YOLO → return detections JSON"""
    t0 = time.time()
    local_image_path, is_temp_image = resolve_image(image_url_or_path)
    t_img = time.time() - t0

    try:
        t1 = time.time()
        local_model_path = resolve_model(model_url_or_path)
        t_model = time.time() - t1

        if not Path(local_image_path).exists():
            raise HTTPException(status_code=404, detail="Image not found")
        if not Path(local_model_path).exists():
            raise HTTPException(status_code=404, detail="Model not found")

        t2 = time.time()
        threshold = settings.AI_CONFIDENCE_THRESHOLD if confidence is None else confidence
        result = YoloService().predict(local_image_path, local_model_path, threshold, augment=augment)
        t_infer = time.time() - t2

        logger.info(
            "predict timing: image %.2fs | model %.2fs | inference %.2fs | total %.2fs | %d detections | tta=%s",
            t_img, t_model, t_infer, time.time() - t0, result["total"], augment,
        )
        return result
    finally:
        # ลบรูปชั่วคราวที่ดาวน์โหลดมาจาก URL
        if is_temp_image and os.path.exists(local_image_path):
            try:
                os.remove(local_image_path)
            except OSError:
                logger.warning("Cannot remove temp image %s", local_image_path)
