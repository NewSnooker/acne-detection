"""
หาไฟล์รูปและไฟล์โมเดลที่ /predict และ /model-metrics จะอ่าน
จำกัดขอบเขต: path ต้องอยู่ใต้โฟลเดอร์ที่กำหนด, URL ต้องมาจาก host ที่อนุญาต
โมเดลจาก URL ดาวน์โหลดครั้งแรกแล้ว cache ที่ MODELS_PATH/<id>.pt
"""
import logging
import os
import re
import shutil
import urllib.request
import uuid
from pathlib import Path
from urllib.error import URLError
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


def _download(url: str, local_path: str, headers: dict[str, str]) -> None:
    # โหลดลงไฟล์ชั่วคราวก่อน แล้วค่อยย้าย กันไฟล์ครึ่ง ๆ กลาง ๆ ค้างเป็น cache
    temp_path = f"{local_path}.{uuid.uuid4().hex}.tmp"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT) as response, open(temp_path, "wb") as out_file:
            shutil.copyfileobj(response, out_file)
        os.replace(temp_path, local_path)
    except (URLError, TimeoutError) as e:
        raise HTTPException(status_code=400, detail=f"Failed to download {url}: {str(e)}")
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

        # ไฟล์โมเดลฝั่ง Next.js (GET /api/models/{id}) ต้องยืนยันด้วย key เดียวกัน
        logger.info("Downloading model %s", match.group(1).lower())
        _download(value, local_path, {"User-Agent": "Mozilla/5.0", "X-API-Key": settings.AI_SERVICE_API_KEY})
        return local_path

    path = Path(value).resolve()
    if path.suffix.lower() != ".pt" or not _is_inside(path, Path(settings.MODELS_PATH)):
        raise HTTPException(status_code=400, detail="Model path is not allowed (ต้องอยู่ใต้ MODELS_PATH)")
    return str(path)
