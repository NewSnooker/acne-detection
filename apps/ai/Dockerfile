FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libxcb1 libgl1 libglib2.0-0 libpng-dev libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

COPY . .

# สร้างโฟลเดอร์ storage / models ในแอพ และปลดล็อกสิทธิ์ให้ Hugging Face บันทึกไฟล์ได้
# RUN mkdir -p storage models && chmod -R 777 storage models

# EXPOSE 7860

# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]


RUN mkdir -p storage models

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]



