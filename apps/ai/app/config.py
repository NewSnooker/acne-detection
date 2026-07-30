from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AI_SERVICE_API_KEY: str = "change-me-strong-secret"
    STORAGE_PATH: str = "./storage"
    MODELS_PATH: str = "./models"
    DEBUG: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
