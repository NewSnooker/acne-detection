import logging
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, Security

from app.schemas import ModelMetricsResponse
from app.security import verify_api_key
from app.services.model_files import resolve_model
from app.services.model_metrics import read_model_metrics

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Model"])


@router.post("/model-metrics", response_model=ModelMetricsResponse)
def model_metrics(
    model_url_or_path: str = Form(..., description="URL หรือ Absolute path ของไฟล์ .pt (กติกาเดียวกับ /predict)"),
    _: str = Security(verify_api_key),
):
    """
    อ่าน mAP@0.5, Precision, Recall (และคำนวณ F1) เป็นร้อยละ จากผลเทรนที่ Ultralytics เก็บไว้ในไฟล์ .pt
    ไฟล์ที่ไม่มีข้อมูลนี้ได้ metrics ว่าง — ดาวน์โหลดโมเดลลง cache ไว้ใช้ตอนวิเคราะห์ด้วย
    """
    local_model_path = resolve_model(model_url_or_path)
    if not Path(local_model_path).exists():
        raise HTTPException(status_code=404, detail="Model not found")
    try:
        metrics = read_model_metrics(local_model_path)
    except Exception as e:  # ไฟล์เสีย / ไม่ใช่ checkpoint ของ PyTorch
        logger.exception("Cannot read model file %s", local_model_path)
        raise HTTPException(status_code=422, detail=f"Cannot read model file: {e}")
    return {"metrics": metrics}
