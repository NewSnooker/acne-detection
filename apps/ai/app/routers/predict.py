import logging
import os
from pathlib import Path

from fastapi import APIRouter, Form, Header, HTTPException, Response, Security

from app.config import settings
from app.schemas import PredictResponse
from app.request_log import StepTimer, clean_request_id
from app.security import verify_api_key
from app.services.model_files import resolve_image, resolve_model
from app.services.yolo_service import YoloService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Inference"])


# def (ไม่ใช่ async) — งานดาวน์โหลดและ YOLO เป็นงานหนักแบบ blocking ให้ FastAPI รันใน thread pool
@router.post("/predict", response_model=PredictResponse)
def predict(
    response: Response,  # FastAPI ใส่ให้เอง — ใช้ตั้ง header Server-Timing / X-Request-ID
    image_url_or_path: str = Form(..., description="URL หรือ Absolute path ของรูป"),
    model_url_or_path: str = Form(..., description="URL หรือ Absolute path ของไฟล์ .pt"),
    confidence: float | None = Form(None, description="เว็บส่งตาม AiModel.confidence — ไม่ส่ง = AI_CONFIDENCE_THRESHOLD (0.2)"),
    augment: bool = Form(False, description="Test-Time Augmentation — เว็บส่งตามค่า useTta ของโมเดล"),
    x_request_id: str | None = Header(None, description="id ของคำขอจากเว็บ ใช้จับคู่ log สองฝั่ง"),
    _: str = Security(verify_api_key),
):
    """รับ path หรือ URL รูปและโมเดล → รัน YOLO → return detections JSON"""
    request_id = clean_request_id(x_request_id)
    timer = StepTimer()
    step = "image"
    local_image_path, is_temp_image = None, False
    try:
        local_image_path, is_temp_image = resolve_image(image_url_or_path)
        if not Path(local_image_path).exists():
            raise HTTPException(status_code=404, detail="Image not found")
        timer.mark("image")

        step = "model"
        local_model_path = resolve_model(model_url_or_path)
        if not Path(local_model_path).exists():
            raise HTTPException(status_code=404, detail="Model not found")
        timer.mark("model")

        step = "inference"
        threshold = settings.AI_CONFIDENCE_THRESHOLD if confidence is None else confidence
        result = YoloService().predict(local_image_path, local_model_path, threshold, augment=augment)
        timer.mark("inference")

        logger.info(
            "predict timing [%s]: %s | %d detections | tta=%s",
            request_id, timer.summary(), result["total"], augment,
        )
        response.headers["Server-Timing"] = timer.server_timing()
        response.headers["X-Request-ID"] = request_id
        return result
    except Exception as error:
        status = error.status_code if isinstance(error, HTTPException) else 500
        logger.log(
            logging.WARNING if status < 500 else logging.ERROR,
            "predict failed [%s]: step=%s status=%d error=%s | %s",
            request_id, step, status, getattr(error, "detail", error), timer.summary(),
        )
        raise
    finally:
        # ลบรูปชั่วคราวที่ดาวน์โหลดมาจาก URL
        if is_temp_image and local_image_path and os.path.exists(local_image_path):
            try:
                os.remove(local_image_path)
            except OSError:
                logger.warning("Cannot remove temp image %s", local_image_path)
