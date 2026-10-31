"""
อ่านค่าประเมินโมเดล (mAP@0.5, Precision, Recall, F1) จากไฟล์ .pt ที่เทรนด้วย Ultralytics

Ultralytics เก็บผล validation ของ epoch ที่บันทึกไว้ใน checkpoint["train_metrics"]
ค่าเป็นสัดส่วน 0–1 จึงแปลงเป็นร้อยละให้ตรงกับช่องในหน้าแอดมิน
Accuracy ไม่มีในงานตรวจจับวัตถุ จึงไม่คืนค่านี้
"""
from typing import Any

# key ใน train_metrics ของ Ultralytics → ชื่อฟิลด์ใน AiModel ฝั่งเว็บ
TRAIN_METRIC_KEYS = {
    "metrics/mAP50(B)": "mAP50",
    "metrics/precision(B)": "precision",
    "metrics/recall(B)": "recall",
}


def _to_percent(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not 0 <= number <= 1:
        return None
    return round(number * 100, 2)


def extract_metrics(checkpoint: Any) -> dict[str, float]:
    """ดึงค่าประเมินจาก checkpoint ที่โหลดแล้ว — คืน {} ถ้าไม่มีข้อมูล"""
    if not isinstance(checkpoint, dict):
        return {}
    train_metrics = checkpoint.get("train_metrics")
    if not isinstance(train_metrics, dict):
        return {}

    result: dict[str, float] = {}
    for source_key, field in TRAIN_METRIC_KEYS.items():
        percent = _to_percent(train_metrics.get(source_key))
        if percent is not None:
            result[field] = percent

    precision, recall = result.get("precision"), result.get("recall")
    if precision is not None and recall is not None and precision + recall > 0:
        result["f1Score"] = round(2 * precision * recall / (precision + recall), 2)
    return result


def read_model_metrics(model_path: str) -> dict[str, float]:
    import torch

    # weights_only=False เพราะ checkpoint ของ Ultralytics เก็บ object ของโมเดลไว้ด้วย
    # ไฟล์มาจากแอดมินอัปโหลดเท่านั้น และ YOLO() ก็โหลดไฟล์เดียวกันแบบนี้อยู่แล้วตอนวิเคราะห์
    checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)
    return extract_metrics(checkpoint)
