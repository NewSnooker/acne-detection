import threading
import os
from pathlib import Path
import torch
from ultralytics import YOLO

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

_cache: dict[str, YOLO] = {}
_lock = threading.Lock()


def _get_model(model_path: str) -> YOLO:
    with _lock:
        if model_path not in _cache:
            _cache[model_path] = YOLO(model_path)
        return _cache[model_path]


def clear_cache(model_path: str | None = None):
    with _lock:
        if model_path:
            _cache.pop(model_path, None)
        else:
            _cache.clear()


class YoloService:
    def predict(self, image_path: str, model_path: str, confidence: float) -> dict:
        model = _get_model(model_path)
        results = model(image_path, conf=confidence, verbose=False)

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
