from fastapi import APIRouter

from app.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/", response_model=HealthResponse)
def root():
    """หน้าแรก — ให้ตัวตรวจสถานะของผู้ให้บริการ (เช่น Render) และคนที่เปิด URL ตรง ๆ ได้คำตอบ 200"""
    return {"status": "ok", "service": "acne-ai", "health": "/health"}


@router.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "service": "acne-ai"}
