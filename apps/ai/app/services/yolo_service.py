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

        counts = {v: 0 for v in ACNE_CLASSES.values()}
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

                counts[acne_type] += 1
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

        return {
            "detections": detections,
            "counts": counts,
            "total": len(detections),
        }
