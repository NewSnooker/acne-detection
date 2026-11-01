"""
ทดสอบ API ของบริการ AI: /health และ /predict
เน้นว่าใครเรียกได้ และ /predict ยอมอ่านไฟล์จากที่ไหนได้บ้าง
"""
from pathlib import Path

import pytest

from .conftest import API_KEY, MODEL_ID

HEADERS = {"X-API-Key": API_KEY}
MODEL_URL = f"http://web:3000/api/models/{MODEL_ID}"


def predict(client, image, model, headers=HEADERS, **extra):
    data = {"image_url_or_path": image, "model_url_or_path": model, **extra}
    return client.post("/predict", data=data, headers=headers)


# ─── สถานะบริการ ────────────────────────────────────────────


@pytest.mark.parametrize("path", ["/", "/health"])
def test_health_endpoints_open_without_key(client, path):
    """หน้าแรกและ /health ตอบ 200 โดยไม่ต้องมี key (ให้ผู้ให้บริการ hosting ตรวจสถานะได้)"""
    res = client.get(path)
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ─── การยืนยันตัวด้วย API key ───────────────────────────────


def test_predict_rejects_wrong_key(client, dirs):
    res = predict(client, str(dirs / "images" / "face.jpg"), str(dirs / "models" / "best.pt"), headers={"X-API-Key": "wrong"})
    assert res.status_code == 403
    assert client.calls == []


def test_predict_rejects_missing_key(client, dirs):
    res = predict(client, str(dirs / "images" / "face.jpg"), str(dirs / "models" / "best.pt"), headers={})
    assert res.status_code in (401, 403)
    assert client.calls == []


# ─── กรณีปกติ ───────────────────────────────────────────────


def test_predict_success_docker_mode(client, dirs):
    """โหมด Docker/รันในเครื่อง: รูปเป็น path ใต้ STORAGE_PATH โมเดลเป็น URL ของเว็บ (cache ไว้แล้ว)"""
    image = dirs / "images" / "face.jpg"

    res = predict(client, str(image), MODEL_URL, confidence="0.25")

    assert res.status_code == 200
    assert res.json() == {"detections": [], "counts": {"papule": 0}, "total": 0}
    assert client.calls == [
        {"image": str(image.resolve()), "model": str(dirs / "models" / f"{MODEL_ID}.pt"), "confidence": 0.25}
    ]


def test_predict_without_confidence_uses_setting(client, dirs, monkeypatch):
    """เว็บไม่ส่ง confidence มา ใช้ AI_CONFIDENCE_THRESHOLD (ค่าเดียวกับฝั่งเว็บ)"""
    from app import main

    monkeypatch.setattr(main.settings, "AI_CONFIDENCE_THRESHOLD", 0.33)
    res = predict(client, str(dirs / "images" / "face.jpg"), MODEL_URL)

    assert res.status_code == 200
    assert client.calls[-1]["confidence"] == 0.33


def test_predict_does_not_delete_stored_image(client, dirs):
    """รูปที่เว็บบันทึกไว้ต้องยังอยู่หลังวิเคราะห์ (ลบเฉพาะรูปชั่วคราวที่ดาวน์โหลดมา)"""
    image = dirs / "images" / "face.jpg"

    predict(client, str(image), MODEL_URL)

    assert image.exists()


def test_predict_accepts_model_path_inside_models_dir(client, dirs):
    res = predict(client, str(dirs / "images" / "face.jpg"), str(dirs / "models" / "best.pt"))
    assert res.status_code == 200


def test_predict_missing_form_fields(client):
    res = client.post("/predict", data={}, headers=HEADERS)
    assert res.status_code == 422


# ─── ขอบเขตของรูป ──────────────────────────────────────────


def test_image_outside_storage_rejected(client, dirs):
    res = predict(client, str(dirs / "other" / "outside.jpg"), MODEL_URL)
    assert res.status_code == 400
    assert client.calls == []


def test_image_path_traversal_rejected(client, dirs):
    res = predict(client, str(dirs / "images" / ".." / "other" / "outside.jpg"), MODEL_URL)
    assert res.status_code == 400
    assert client.calls == []


@pytest.mark.parametrize("path", ["/etc/passwd", "/etc/hosts"])
def test_non_image_system_file_rejected(client, path):
    res = predict(client, path, MODEL_URL)
    assert res.status_code == 400
    assert client.calls == []


def test_non_image_extension_inside_storage_rejected(client, dirs):
    target = dirs / "images" / "notes.txt"
    target.write_bytes(b"x")

    res = predict(client, str(target), MODEL_URL)

    assert res.status_code == 400


def test_image_not_found(client, dirs):
    res = predict(client, str(dirs / "images" / "missing.jpg"), MODEL_URL)
    assert res.status_code == 404
    assert client.calls == []


@pytest.mark.parametrize(
    "url",
    [
        "https://evil.example.com/a.jpg",  # host อื่น
        "http://store.public.blob.vercel-storage.com/a.jpg",  # ไม่ใช่ https
        "https://public.blob.vercel-storage.com.evil.com/a.jpg",  # ปลอมชื่อให้คล้าย
        "https://localhost/a.jpg",  # ชี้กลับมาที่เครื่องตัวเอง
        "http://169.254.169.254/latest/meta-data/",  # ที่อยู่ภายในของผู้ให้บริการ cloud
    ],
)
def test_image_url_from_disallowed_host_rejected(client, url):
    res = predict(client, url, MODEL_URL)
    assert res.status_code == 400
    assert client.calls == []


def test_image_url_from_vercel_blob_is_downloaded_then_removed(client, dirs, monkeypatch):
    """โหมด hosted: รูปมาจาก Vercel Blob → ดาวน์โหลดเป็นไฟล์ชั่วคราว → ลบทิ้งหลังวิเคราะห์"""
    from app.services import model_files

    downloaded = []

    def fake_download(url, local_path, headers):
        downloaded.append({"url": url, "path": local_path, "headers": headers})
        with open(local_path, "wb") as f:
            f.write(b"img")

    monkeypatch.setattr(model_files, "_download", fake_download)
    url = "https://store123.public.blob.vercel-storage.com/acne-ai/abc.png"

    res = predict(client, url, MODEL_URL)

    assert res.status_code == 200
    assert downloaded[0]["url"] == url
    # ไม่ส่ง API key ไปกับคำขอดาวน์โหลดรูป
    assert "X-API-Key" not in downloaded[0]["headers"]
    temp_path = downloaded[0]["path"]
    assert temp_path.startswith(str(dirs / "images")) and temp_path.endswith(".png")
    assert client.calls[0]["image"] == temp_path
    assert not Path(temp_path).exists()


# ─── ขอบเขตของโมเดล ────────────────────────────────────────


def test_model_path_outside_models_dir_rejected(client, dirs):
    res = predict(client, str(dirs / "images" / "face.jpg"), str(dirs / "other" / "outside.pt"))
    assert res.status_code == 400
    assert client.calls == []


def test_model_path_must_be_pt_file(client, dirs):
    res = predict(client, str(dirs / "images" / "face.jpg"), str(dirs / "images" / "face.jpg"))
    assert res.status_code == 400


@pytest.mark.parametrize(
    "url",
    [
        "http://web:3000/api/users",
        "http://web:3000/api/models/../../etc/passwd",
        "http://web:3000/api/models/not-an-id",
        "http://web:3000/api/models/" + "a" * 24 + "/edit",
        "http://web:3000/secret.pt",
    ],
)
def test_model_url_must_be_web_model_endpoint(client, dirs, url):
    res = predict(client, str(dirs / "images" / "face.jpg"), url)
    assert res.status_code == 400
    assert client.calls == []


def test_model_download_sends_api_key_and_caches(client, dirs, monkeypatch):
    """โมเดลที่ยังไม่มีในเครื่อง: ดาวน์โหลดจากเว็บพร้อม API key แล้วเก็บเป็น <id>.pt ครั้งถัดไปไม่โหลดซ้ำ"""
    from app.services import model_files

    downloaded = []

    def fake_download(url, local_path, headers):
        downloaded.append({"url": url, "path": local_path, "headers": headers})
        with open(local_path, "wb") as f:
            f.write(b"model")

    monkeypatch.setattr(model_files, "_download", fake_download)
    monkeypatch.setattr(model_files, "model_parts", lambda url, model_id, headers: [url])
    new_id = "b" * 24
    url = f"http://web:3000/api/models/{new_id}"
    image = str(dirs / "images" / "face.jpg")

    first = predict(client, image, url)
    second = predict(client, image, url)

    assert first.status_code == 200 and second.status_code == 200
    assert len(downloaded) == 1  # ครั้งที่สองใช้ไฟล์ที่ cache ไว้
    assert downloaded[0]["headers"]["X-API-Key"] == API_KEY
    assert downloaded[0]["path"] == str(dirs / "models" / f"{new_id}.pt")


def test_model_host_allowlist(client, dirs, monkeypatch):
    """ตั้ง ALLOWED_MODEL_HOSTS แล้ว รับ URL โมเดลจาก host ที่กำหนดเท่านั้น"""
    from app import main

    monkeypatch.setattr(main.settings, "ALLOWED_MODEL_HOSTS", "web, my-app.vercel.app")
    image = str(dirs / "images" / "face.jpg")

    assert predict(client, image, MODEL_URL).status_code == 200
    assert predict(client, image, f"https://my-app.vercel.app/api/models/{MODEL_ID}").status_code == 200
    assert predict(client, image, f"http://evil:3000/api/models/{MODEL_ID}").status_code == 400
