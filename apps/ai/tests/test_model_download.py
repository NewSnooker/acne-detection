"""ดาวน์โหลดไฟล์โมเดลจากเว็บ: ทั้งไฟล์ (แบบเก่า) หรือทีละชิ้นตาม manifest (แบบหั่นชิ้นใน MongoDB)"""
import io
import json
from urllib.error import HTTPError

import pytest
from fastapi import HTTPException

from .conftest import API_KEY

MODEL_ID = "e" * 24  # ไม่ซ้ำกับโมเดลที่เทสต์อื่น cache ไว้
BASE = f"http://web:3000/api/models/{MODEL_ID}"
HEADERS = {"X-API-Key": API_KEY}


class FakeWeb:
    """แทน urllib.request.urlopen — ตอบตาม URL ที่ลงทะเบียนไว้"""

    def __init__(self, routes):
        self.routes = routes
        self.requested = []

    def __call__(self, req, timeout=None):
        url = req.full_url
        self.requested.append(url)
        body = self.routes.get(url)
        if body is None:
            raise HTTPError(url, 404, "Not Found", {}, None)
        return io.BytesIO(body)


@pytest.fixture()
def main_module(dirs):
    from app import main

    return main


def test_parts_from_manifest(main_module, monkeypatch):
    parts = [f"/api/models/{MODEL_ID}/chunks/0", f"/api/models/{MODEL_ID}/chunks/1"]
    web = FakeWeb({f"{BASE}/manifest": json.dumps({"parts": parts}).encode()})
    monkeypatch.setattr(main_module.urllib.request, "urlopen", web)

    assert main_module.model_parts(BASE, MODEL_ID, HEADERS) == [f"http://web:3000{p}" for p in parts]


def test_parts_fallback_when_web_has_no_manifest(main_module, monkeypatch):
    monkeypatch.setattr(main_module.urllib.request, "urlopen", FakeWeb({}))

    assert main_module.model_parts(BASE, MODEL_ID, HEADERS) == [BASE]


@pytest.mark.parametrize(
    "parts",
    [[], ["/api/models/" + "c" * 24 + "/chunks/0"], ["/etc/passwd"], ["http://evil/api/models/x"]],
)
def test_parts_rejects_unexpected_manifest(main_module, monkeypatch, parts):
    web = FakeWeb({f"{BASE}/manifest": json.dumps({"parts": parts}).encode()})
    monkeypatch.setattr(main_module.urllib.request, "urlopen", web)

    with pytest.raises(HTTPException) as exc:
        main_module.model_parts(BASE, MODEL_ID, HEADERS)
    assert exc.value.status_code == 400


def test_resolve_model_joins_chunks_into_cache(main_module, dirs, monkeypatch):
    parts = [f"/api/models/{MODEL_ID}/chunks/0", f"/api/models/{MODEL_ID}/chunks/1"]
    web = FakeWeb(
        {
            f"{BASE}/manifest": json.dumps({"parts": parts}).encode(),
            f"http://web:3000{parts[0]}": b"AAAA",
            f"http://web:3000{parts[1]}": b"BB",
        }
    )
    monkeypatch.setattr(main_module.urllib.request, "urlopen", web)

    path = main_module.resolve_model(BASE)

    assert path.endswith(f"{MODEL_ID}.pt")
    with open(path, "rb") as f:
        assert f.read() == b"AAAABB"
    # ครั้งต่อไปใช้ cache ไม่โหลดซ้ำ
    web.requested.clear()
    assert main_module.resolve_model(BASE) == path
    assert web.requested == []


def test_missing_chunk_leaves_no_partial_cache(main_module, dirs, monkeypatch):
    model_id = "d" * 24
    base = f"http://web:3000/api/models/{model_id}"
    parts = [f"/api/models/{model_id}/chunks/0", f"/api/models/{model_id}/chunks/1"]
    web = FakeWeb(
        {
            f"{base}/manifest": json.dumps({"parts": parts}).encode(),
            f"http://web:3000{parts[0]}": b"AAAA",
        }
    )
    monkeypatch.setattr(main_module.urllib.request, "urlopen", web)

    with pytest.raises(HTTPException) as exc:
        main_module.resolve_model(base)
    assert exc.value.status_code == 400
    assert not (dirs / "models" / f"{model_id}.pt").exists()
