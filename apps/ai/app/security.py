from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from app.config import settings

# เรียกได้เฉพาะ Next.js ที่ถือ key เดียวกัน
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)


def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    if api_key != settings.AI_SERVICE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key
