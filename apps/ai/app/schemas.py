"""รูปแบบ response ของ API — ฝั่งเว็บอ่านตามนี้ (types/analyze.ts) และแสดงใน /docs"""
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    health: str | None = None


class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    type: str  # ชื่อคลาสสิว 6 ตัว (ห้ามเปลี่ยนตัวสะกด — ใช้เป็น key ร่วมกับเว็บและฐานข้อมูล)
    confidence: float
    bbox: BBox


class PredictResponse(BaseModel):
    detections: list[Detection]
    counts: dict[str, int]
    total: int


class ModelMetricsResponse(BaseModel):
    # ร้อยละ 0–100 เฉพาะค่าที่อ่านได้: mAP50, precision, recall, f1Score
    metrics: dict[str, float]
