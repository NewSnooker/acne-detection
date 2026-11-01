FROM node:20-alpine

WORKDIR /app

# ติดตั้ง dependencies ตาม package-lock.json ทุกตัว (npm ci: build ซ้ำได้รุ่นเดิมเสมอ)
COPY package.json package-lock.json ./
RUN npm ci

# คัดลอกซอร์สโค้ด (.env และ node_modules ถูกกันไว้ด้วย .dockerignore)
COPY . .

# สร้าง Prisma Client
RUN npx prisma generate

# build Next.js — ค่า env ในบรรทัดนี้ใช้เฉพาะตอน build เท่านั้น
# ค่าจริงตอนรันมาจาก docker-compose.yml
RUN DATABASE_URL="mongodb://localhost:27017/build" AUTH_SECRET="build-only" npm run build

EXPOSE 3000

# 1) sync index ขึ้น MongoDB (MongoDB ไม่มี migration; คำสั่งนี้ไม่ลบเอกสาร —
#    --accept-data-loss จำเป็นเพราะ Prisma เตือนเรื่อง index แล้วจะหยุด container ถ้าไม่มี flag นี้)
# 2) สร้างแอดมินและโมเดลเริ่มต้นถ้ายังไม่มี (ถ้าพลาดจะข้ามไป ไม่ขวางการเปิดเว็บ)
# 3) เริ่มเว็บ
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && (node prisma/seed.mjs || echo '[seed] ข้าม') && npm start"]
