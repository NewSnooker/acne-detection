"""
ตั้งค่าร่วมของชุดทดสอบบริการ AI

ชุดทดสอบนี้ไม่โหลด PyTorch / Ultralytics และไม่ใช้ไฟล์โมเดลจริง
จึงรันจบในไม่กี่วินาที และรันได้แม้เครื่องยังไม่ได้ติดตั้ง torch
"""
import os
import sys
import tempfile
import types
from pathlib import Path

import pytest

# ─── 1. ใส่ตัวแทนของ torch และ ultralytics ก่อนที่โค้ดจริงจะ import ───
_torch = types.ModuleType("torch")
_torch.set_num_threads = lambda n: None
sys.modules["torch"] = _torch

_ultralytics = types.ModuleType("ultralytics")


class _FakeYOLO:
    def __init__(self, model_path):
        self.model_path = model_path


_ultralytics.YOLO = _FakeYOLO
sys.modules["ultralytics"] = _ultralytics

# ─── 2. ตั้งค่า env ให้ชี้ไปโฟลเดอร์ชั่วคราว ก่อน import app ───
_ROOT = Path(tempfile.mkdtemp(prefix="acne-ai-test-"))
API_KEY = "test-ai-key"
os.environ["AI_SERVICE_API_KEY"] = API_KEY
os.environ["STORAGE_PATH"] = str(_ROOT / "images")
os.environ["MODELS_PATH"] = str(_ROOT / "models")
os.environ["ALLOWED_IMAGE_HOSTS"] = ".public.blob.vercel-storage.com"
os.environ["ALLOWED_MODEL_HOSTS"] = ""
os.environ["DEBUG"] = "false"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

MODEL_ID = "a" * 24


@pytest.fixture(scope="session")
def dirs():
    """โฟลเดอร์ชั่วคราว: images (ที่เก็บรูป), models (ที่เก็บโมเดล), other (นอกขอบเขต)"""
    for name in ("images", "models", "other"):
        (_ROOT / name).mkdir(exist_ok=True)
    (_ROOT / "images" / "face.jpg").write_bytes(b"img")
    (_ROOT / "other" / "outside.jpg").write_bytes(b"img")
    (_ROOT / "other" / "secret.txt").write_bytes(b"secret")
    (_ROOT / "models" / "best.pt").write_bytes(b"model")
    (_ROOT / "models" / f"{MODEL_ID}.pt").write_bytes(b"model")  # โมเดลที่ cache ไว้แล้ว
    (_ROOT / "other" / "outside.pt").write_bytes(b"model")
    return _ROOT


@pytest.fixture()
def client(dirs, monkeypatch):
    """TestClient ของ FastAPI โดยแทน YoloService ด้วยตัวจำลองที่จำว่าถูกเรียกด้วยอะไร"""
    from fastapi.testclient import TestClient

    from app import main

    calls = []

    class FakeYoloService:
        def predict(self, image_path, model_path, confidence):
            calls.append({"image": image_path, "model": model_path, "confidence": confidence})
            return {"detections": [], "counts": {"papule": 0}, "total": 0}

    monkeypatch.setattr(main, "YoloService", FakeYoloService)
    monkeypatch.setattr(main.settings, "ALLOWED_MODEL_HOSTS", "")

    with TestClient(main.app) as test_client:
        test_client.calls = calls
        yield test_client
