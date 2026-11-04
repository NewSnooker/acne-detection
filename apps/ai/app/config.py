from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AI_SERVICE_API_KEY: str = "change-me-strong-secret"
    STORAGE_PATH: str = "./storage"
    MODELS_PATH: str = "./models"
    # host ที่ยอมให้ดาวน์โหลดรูปผ่าน URL (คั่นด้วย , ; ขึ้นต้นด้วย . = รวม subdomain)
    # Azure: ตั้ง ALLOWED_IMAGE_HOSTS=.blob.core.windows.net
    ALLOWED_IMAGE_HOSTS: str = ".public.blob.vercel-storage.com"
    # host ของเว็บที่ยอมให้ดาวน์โหลดไฟล์โมเดล (เว้นว่าง = ไม่จำกัด host)
    ALLOWED_MODEL_HOSTS: str = ""
    # ความมั่นใจขั้นต่ำสำรอง ใช้เมื่อคำขอไม่ได้ส่ง confidence มา (เว็บส่งตาม AiModel.confidence ทุกครั้ง)
    AI_CONFIDENCE_THRESHOLD: float = 0.2
    # NMS แบบไม่แยกชนิด: สิวเม็ดเดียวที่โมเดลทายได้ 2 ชนิด (เช่น ตุ่มหนอง + ตุ่มแดง) เหลือกรอบที่มั่นใจสุดกรอบเดียว
    # false = แบบเดิมของ Ultralytics (คัดกรอบซ้ำแยกทีละชนิด) — ใช้ตอนวัดผลเทียบกับเล่ม ดู dev-docs/experiments.md
    AI_AGNOSTIC_NMS: bool = True
    # IoU ของ NMS: กรอบที่ทับกันเกินค่านี้เหลือกรอบที่มั่นใจสุด (Ultralytics ใช้ 0.7)
    # 0.5 = ตัดกรอบเล็กที่ซ้อนอยู่ในกรอบใหญ่บนสิวเม็ดเดียวด้วย — ดู dev-docs/experiments.md
    AI_NMS_IOU: float = 0.5
    DEBUG: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
