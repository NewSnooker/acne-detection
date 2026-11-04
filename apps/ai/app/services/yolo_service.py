import logging
import threading
import os
from pathlib import Path
import torch
from ultralytics import YOLO

from app.config import settings

# ป้องกันปัญหา PyTorch สร้าง Thread มากเกินไปใน Container (ซึ่งทำให้เกิด CPU Throttling ช้า 20-30 วินาที)
torch.set_num_threads(min(2, os.cpu_count() or 1))

# ─── Class map ─────────────────────────────────────────────
ACNE_CLASSES = {
    0: "blackhead",
    1: "cyst",
    2: "nodule",
    3: "papule",
    4: "pustule",
    5: "whitehead",
}

logger = logging.getLogger(__name__)

_cache: dict[str, YOLO] = {}
_lock = threading.Lock()


def _same_class_name(model_name, expected: str | None) -> bool:
    """ชื่อเดียวกันถ้าต่างกันแค่ตัวพิมพ์หรือ s ท้ายคำ — dataset Acne14k ตั้งชื่อเป็นพหูพจน์ (blackheads)"""
    if not isinstance(model_name, str) or expected is None:
        return model_name == expected
    return model_name.strip().lower().removesuffix("s") == expected.removesuffix("s")


def class_names_mismatch(names) -> dict[int, tuple[str | None, str | None]]:
    """เทียบชื่อคลาสในโมเดลกับ ACNE_CLASSES — คืน {index: (ในโมเดล, ที่ระบบคาด)} เฉพาะที่ลำดับไม่ตรงจริง"""
    if not isinstance(names, dict):
        return {}
    model_names = {int(k): v for k, v in names.items()}
    return {
        i: (model_names.get(i), ACNE_CLASSES.get(i))
        for i in sorted(set(model_names) | set(ACNE_CLASSES))
        if not _same_class_name(model_names.get(i), ACNE_CLASSES.get(i))
    }


def _get_model(model_path: str) -> YOLO:
    with _lock:
        if model_path not in _cache:
            model = YOLO(model_path)
            mismatch = class_names_mismatch(getattr(model, "names", None))
            if mismatch:
                # ลำดับคลาสไม่ตรง = ผลวิเคราะห์จะเรียกชื่อสิวผิดชนิด (กฎข้อ 4 ใน CLAUDE.md)
                logger.warning("Model %s class order differs from ACNE_CLASSES: %s", model_path, mismatch)
            _cache[model_path] = model
        return _cache[model_path]


def clear_cache(model_path: str | None = None):
    with _lock:
        if model_path:
            _cache.pop(model_path, None)
        else:
            _cache.clear()


def _inside_ratio(inner: dict, outer: dict) -> float:
    """สัดส่วนพื้นที่ของกรอบ inner ที่อยู่ในกรอบ outer (0-1)"""
    w = min(inner["x2"], outer["x2"]) - max(inner["x1"], outer["x1"])
    h = min(inner["y2"], outer["y2"]) - max(inner["y1"], outer["y1"])
    area = (inner["x2"] - inner["x1"]) * (inner["y2"] - inner["y1"])
    if w <= 0 or h <= 0 or area <= 0:
        return 0.0
    return (w * h) / area


def drop_nested_boxes(detections: list[dict], threshold: float) -> list[dict]:
    """ตัดกรอบที่อยู่ในกรอบซึ่งมั่นใจกว่าเกิน threshold ของพื้นที่ตัวเอง (ไม่สนชนิด)

    NMS ใช้ IoU จึงไม่ตัดกรอบเล็กที่ซ้อนอยู่ในกรอบใหญ่ (IoU ต่ำเพราะขนาดต่างกัน)
    threshold <= 0 = ปิด
    """
    if threshold <= 0:
        return detections
    kept: list[dict] = []
    for det in sorted(detections, key=lambda d: d["confidence"], reverse=True):
        if all(
            _inside_ratio(det["bbox"], k["bbox"]) < threshold and _inside_ratio(k["bbox"], det["bbox"]) < threshold
            for k in kept
        ):
            kept.append(det)
    return kept


class YoloService:
    def predict(self, image_path: str, model_path: str, confidence: float, augment: bool = False) -> dict:
        model = _get_model(model_path)
        # agnostic_nms + iou: กันกรอบซ้อนกันบนสิวเม็ดเดียว (ดูเหตุผลใน dev-docs/experiments.md)
        results = model(
            image_path,
            conf=confidence,
            augment=augment,
            agnostic_nms=settings.AI_AGNOSTIC_NMS,
            iou=settings.AI_NMS_IOU,
            verbose=False,
        )

        detections = []

        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls_id = int(box.cls[0].item())
                acne_type = ACNE_CLASSES.get(cls_id)
                if not acne_type:
                    continue

                conf = round(float(box.conf[0].item()), 4)
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                detections.append({
                    "type": acne_type,
                    "confidence": conf,
                    "bbox": {
                        "x1": round(x1, 1),
                        "y1": round(y1, 1),
                        "x2": round(x2, 1),
                        "y2": round(y2, 1),
                    },
                })

        before = len(detections)
        detections = drop_nested_boxes(detections, settings.AI_NESTED_BOX_RATIO)
        logger.info(
            "boxes after NMS %d -> after nested filter %d (agnostic=%s iou=%s nested=%s tta=%s)",
            before, len(detections), settings.AI_AGNOSTIC_NMS, settings.AI_NMS_IOU, settings.AI_NESTED_BOX_RATIO, augment,
        )
        counts = {v: 0 for v in ACNE_CLASSES.values()}
        for det in detections:
            counts[det["type"]] += 1

        return {
            "detections": detections,
            "counts": counts,
            "total": len(detections),
        }
