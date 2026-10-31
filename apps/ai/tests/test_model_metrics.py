"""อ่านค่าประเมินโมเดลจากไฟล์ .pt (ขอบเขตข้อ 1.3.3.3) — ไม่โหลด torch จริง"""
import pytest

from app.services.model_metrics import extract_metrics
from .conftest import API_KEY, MODEL_ID

HEADERS = {"X-API-Key": API_KEY}
MODEL_URL = f"http://localhost:3000/api/models/{MODEL_ID}"

ULTRALYTICS_CKPT = {
    "epoch": -1,
    "train_metrics": {
        "metrics/precision(B)": 0.8123,
        "metrics/recall(B)": 0.7011,
        "metrics/mAP50(B)": 0.7654,
        "metrics/mAP50-95(B)": 0.45,
        "val/box_loss": 1.2,
    },
}


def test_extract_metrics_converts_to_percent_and_computes_f1():
    assert extract_metrics(ULTRALYTICS_CKPT) == {
        "mAP50": 76.54,
        "precision": 81.23,
        "recall": 70.11,
        "f1Score": 75.26,
    }


@pytest.mark.parametrize(
    "checkpoint",
    [None, "not a dict", {}, {"train_metrics": None}, {"train_metrics": {"other": 1}}],
)
def test_extract_metrics_without_training_data_returns_empty(checkpoint):
    assert extract_metrics(checkpoint) == {}


def test_extract_metrics_skips_invalid_values_and_f1_needs_both():
    ckpt = {"train_metrics": {"metrics/precision(B)": "x", "metrics/recall(B)": 1.5, "metrics/mAP50(B)": 0.5}}
    assert extract_metrics(ckpt) == {"mAP50": 50.0}


def test_endpoint_requires_key(client):
    res = client.post("/model-metrics", data={"model_url_or_path": MODEL_URL}, headers={"X-API-Key": "wrong"})
    assert res.status_code == 403


def test_endpoint_reads_cached_model(client, dirs, monkeypatch):
    from app import main

    seen = []
    monkeypatch.setattr(main, "read_model_metrics", lambda path: seen.append(path) or {"mAP50": 80.0})

    res = client.post("/model-metrics", data={"model_url_or_path": MODEL_URL}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"metrics": {"mAP50": 80.0}}
    assert seen == [str(dirs / "models" / f"{MODEL_ID}.pt")]


def test_endpoint_rejects_model_outside_models_dir(client, dirs):
    res = client.post(
        "/model-metrics", data={"model_url_or_path": str(dirs / "other" / "outside.pt")}, headers=HEADERS
    )
    assert res.status_code == 400


def test_endpoint_unreadable_file_returns_422(client, monkeypatch):
    from app import main

    def broken(path):
        raise ValueError("not a zip")

    monkeypatch.setattr(main, "read_model_metrics", broken)
    res = client.post("/model-metrics", data={"model_url_or_path": MODEL_URL}, headers=HEADERS)
    assert res.status_code == 422
