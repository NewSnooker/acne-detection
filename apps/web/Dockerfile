FROM node:20-alpine

WORKDIR /app

# ติดตั้ง dependencies
COPY package.json package-lock.json* ./
RUN npm install

# คัดลอกซอร์สโค้ด (.env และ node_modules ถูกกันไว้ด้วย .dockerignore)
COPY . .

# สร้าง Prisma Client
RUN npx prisma generate

# build Next.js — ค่า env ในบรรทัดนี้ใช้เฉพาะตอน build เท่านั้น
# ค่าจริงตอนรันมาจาก docker-compose.yml
RUN DATABASE_URL="mongodb://localhost:27017/build" AUTH_SECRET="build-only" npm run build

EXPOSE 3000

# 1) sync index ขึ้น MongoDB (MongoDB ไม่มี migration; คำสั่งนี้ไม่ลบข้อมูลใน collection)
# 2) เริ่มเว็บ
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && npm start"]
