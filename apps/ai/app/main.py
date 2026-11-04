import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, models, predict

# log มีเวลาและระดับ — Render/Docker แสดงและค้นหาได้
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    os.makedirs(settings.MODELS_PATH, exist_ok=True)
    logging.getLogger(__name__).info(
        "ai start: commit %s | agnostic_nms=%s iou=%s nested_box_ratio=%s",
        os.getenv("GIT_SHA", "dev")[:7], settings.AI_AGNOSTIC_NMS, settings.AI_NMS_IOU, settings.AI_NESTED_BOX_RATIO,
    )
    yield


app = FastAPI(
    title="Acne AI Service",
    version="1.0.0",
    description="YOLO Local Inference Service — Internal use only",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(models.router)
