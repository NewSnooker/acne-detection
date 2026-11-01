"""
หาไฟล์รูปและไฟล์โมเดลที่ /predict และ /model-metrics จะอ่าน
จำกัดขอบเขต: path ต้องอยู่ใต้โฟลเดอร์ที่กำหนด, URL ต้องมาจาก host ที่อนุญาต
โมเดลจาก URL ดาวน์โหลดครั้งแรกแล้ว cache ที่ MODELS_PATH/<id>.pt
"""
import json
import logging
import os
import re
import shutil
import urllib.request
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse

from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

# เวลารอสูงสุดตอนดาวน์โหลดรูป/โมเดล (วินาที)
DOWNLOAD_TIMEOUT = 120

# ─── ขอบเขตของไฟล์ที่ /predict ยอมอ่าน ─────────────────────
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
# URL ของโมเดลต้องเป็น /api/models/<id 24 หลัก> ของฝั่งเว็บเท่านั้น
MODEL_URL_PATH = re.compile(r"^/api/models/([0-9a-fA-F]{24})$")
# path ที่ manifest ส่งมาได้: ทั้งไฟล์ หรือทีละชิ้น ของโมเดลตัวเดียวกัน
MODEL_PART_PATH = re.compile(r"^/api/models/([0-9a-fA-F]{24})(?:/chunks/\d+)?$")
# โฟลเดอร์ apps/images ของโปรเจค — ตอนรันแบบไม่ใช้ Docker เว็บเก็บรูปไว้ที่นี่
REPO_IMAGES_DIR = Path(__file__).resolve().parents[3] / "images"


def _is_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def _split_hosts(value: str) -> list[str]:
    return [h.strip().lower() for h in value.split(",") if h.strip()]


def _host_allowed(host: str | None, allowed: list[str]) -> bool:
    host = (host or "").lower()
    for item in allowed:
        if item.startswith("."):
            if host.endswith(item):
                return True
        elif host == item:
            return True
    return False


def _is_inside(path: Path, base: Path) -> bool:
    """path อยู่ใต้โฟลเดอร์ base จริงหรือไม่ (เทียบหลังแปลงเป็น path เต็มแล้ว กัน ../)"""
    try:
        path.relative_to(base.resolve())
        return True
    except ValueError:
        return False


def _download(url: str | list[str], local_path: str, headers: dict[str, str]) -> None:
    """ดาวน์โหลด URL เดียว หรือหลาย URL ต่อกันเป็นไฟล์เดียว (ไฟล์โมเดลที่หั่นเป็นชิ้น)"""
    urls = [url] if isinstance(url, str) else url
    # โหลดลงไฟล์ชั่วคราวก่อน แล้วค่อยย้าย กันไฟล์ครึ่ง ๆ กลาง ๆ ค้างเป็น cache
    temp_path = f"{local_path}.{uuid.uuid4().hex}.tmp"
    current = urls[0]
    try:
        with open(temp_path, "wb") as out_file:
            for current in urls:
                req = urllib.request.Request(current, headers=headers)
                with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT) as response:
                    shutil.copyfileobj(response, out_file)
        os.replace(temp_path, local_path)
    except (URLError, TimeoutError) as e:
        raise HTTPException(status_code=400, detail=f"Failed to download {current}: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


def resolve_image(value: str) -> tuple[str, bool]:
    """
    คืน (path ของรูปบนดิสก์, เป็นไฟล์ชั่วคราวที่ต้องลบทิ้งหรือไม่)
    - URL: ต้องเป็น https และ host อยู่ใน ALLOWED_IMAGE_HOSTS แล้วดาวน์โหลดมาเก็บชั่วคราว
    - path: ต้องเป็นไฟล์รูปที่อยู่ใต้ STORAGE_PATH (หรือ apps/images ของโปรเจค) เท่านั้น
    """
    if _is_url(value):
        parsed = urlparse(value)
        if parsed.scheme != "https" or not _host_allowed(parsed.hostname, _split_hosts(settings.ALLOWED_IMAGE_HOSTS)):
            raise HTTPException(status_code=400, detail="Image URL is not allowed (ตรวจค่า ALLOWED_IMAGE_HOSTS)")
        ext = Path(parsed.path).suffix.lower()
        if ext not in IMAGE_EXTENSIONS:
            ext = ".jpg"
        local_path = os.path.join(settings.STORAGE_PATH, f"tmp_{uuid.uuid4().hex}{ext}")
        _download(value, local_path, {"User-Agent": "Mozilla/5.0"})
        return local_path, True

    path = Path(value).resolve()
    allowed_roots = [Path(settings.STORAGE_PATH), REPO_IMAGES_DIR]
    if path.suffix.lower() not in IMAGE_EXTENSIONS or not any(_is_inside(path, root) for root in allowed_roots):
        raise HTTPException(
            status_code=400,
            detail="Image path is not allowed (ต้องอยู่ใต้ STORAGE_PATH — ตั้งให้ตรงกับฝั่งเว็บ)",
        )
    return str(path), False


def model_parts(model_url: str, model_id: str, headers: dict[str, str]) -> list[str]:
    """
    ถามเว็บว่าไฟล์โมเดลต้องโหลดจาก path ไหนบ้าง (GET /api/models/<id>/manifest)
    - เว็บรุ่นที่ไม่มี manifest (404) → โหลดทั้งไฟล์จาก model_url เหมือนเดิม
    - path ที่ได้ต้องเป็นของโมเดลตัวเดียวกันบน host เดียวกันเท่านั้น
    """
    req = urllib.request.Request(f"{model_url}/manifest", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT) as response:
            manifest = json.load(response)
    except HTTPError as e:
        if e.code == 404:
            return [model_url]
        raise HTTPException(status_code=400, detail=f"Failed to read model manifest: HTTP {e.code}")
    except (URLError, TimeoutError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Failed to read model manifest: {e}")

    parsed = urlparse(model_url)
    parts = manifest.get("parts") if isinstance(manifest, dict) else None
    if not isinstance(parts, list) or not parts:
        raise HTTPException(status_code=400, detail="Model manifest is empty")
    urls = []
    for part in parts:
        match = MODEL_PART_PATH.match(part) if isinstance(part, str) else None
        if not match or match.group(1).lower() != model_id:
            raise HTTPException(status_code=400, detail="Model manifest has an unexpected path")
        urls.append(f"{parsed.scheme}://{parsed.netloc}{part}")
    return urls


def resolve_model(value: str) -> str:
    """
    คืน path ของไฟล์โมเดลบนดิสก์
    - URL: ต้องเป็น /api/models/<id> ของฝั่งเว็บ ดาวน์โหลดครั้งแรกแล้วเก็บเป็น cache ที่ MODELS_PATH/<id>.pt
    - path: ต้องเป็นไฟล์ .pt ที่อยู่ใต้ MODELS_PATH เท่านั้น
    """
    if _is_url(value):
        parsed = urlparse(value)
        match = MODEL_URL_PATH.match(parsed.path)
        allowed_hosts = _split_hosts(settings.ALLOWED_MODEL_HOSTS)
        if not match or (allowed_hosts and not _host_allowed(parsed.hostname, allowed_hosts)):
            raise HTTPException(status_code=400, detail="Model URL is not allowed")

        local_path = os.path.join(settings.MODELS_PATH, f"{match.group(1).lower()}.pt")
        if os.path.exists(local_path):
            return local_path  # Cache hit

        # ไฟล์โมเดลฝั่ง Next.js ต้องยืนยันด้วย key เดียวกัน — โมเดลใหญ่โหลดทีละชิ้นตาม manifest
        headers = {"User-Agent": "Mozilla/5.0", "X-API-Key": settings.AI_SERVICE_API_KEY}
        model_id = match.group(1).lower()
        logger.info("Downloading model %s", model_id)
        _download(model_parts(value, model_id, headers), local_path, headers)
        return local_path

    path = Path(value).resolve()
    if path.suffix.lower() != ".pt" or not _is_inside(path, Path(settings.MODELS_PATH)):
        raise HTTPException(status_code=400, detail="Model path is not allowed (ต้องอยู่ใต้ MODELS_PATH)")
    return str(path)
