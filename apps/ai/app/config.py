from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AI_SERVICE_API_KEY: str = "change-me-strong-secret"
    STORAGE_PATH: str = "./storage"
    MODELS_PATH: str = "./models"
    # host ที่ยอมให้ดาวน์โหลดรูปผ่าน URL (คั่นด้วย , ; ขึ้นต้นด้วย . = รวม subdomain)
    ALLOWED_IMAGE_HOSTS: str = ".public.blob.vercel-storage.com"
    # host ของเว็บที่ยอมให้ดาวน์โหลดไฟล์โมเดล (เว้นว่าง = ไม่จำกัด host)
    ALLOWED_MODEL_HOSTS: str = ""
    # ความมั่นใจขั้นต่ำของกรอบสิว ใช้เมื่อเว็บไม่ได้ส่ง confidence มา — ต้องตรงกับ AI_CONFIDENCE_THRESHOLD ของ web
    AI_CONFIDENCE_THRESHOLD: float = 0.25
    DEBUG: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
