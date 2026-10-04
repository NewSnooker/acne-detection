FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libxcb1 libgl1 libglib2.0-0 libpng-dev libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# ติดตั้ง PyTorch รุ่น CPU ก่อน (ถ้าปล่อยให้ ultralytics ดึงเอง จะได้รุ่น CUDA ที่ใหญ่หลาย GB)
RUN pip install --default-timeout=1000 --no-cache-dir torch torchvision \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# .env, venv และไฟล์โมเดลถูกกันไว้ด้วย .dockerignore
COPY . .

RUN mkdir -p storage models images

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
