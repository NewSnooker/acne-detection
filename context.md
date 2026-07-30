# AcneAI - Project Context & Architecture

## Overview

AcneAI เป็นโปรเจกต์เว็บแอปพลิเคชันสำหรับการวิเคราะห์และตรวจจับสิว (Acne Detection) บนใบหน้าโดยอัตโนมัติ โดยใช้โมเดล AI (YOLO) ในการประมวลผล โปรเจกต์นี้ถูกออกแบบมาเพื่อช่วยให้ผู้ใช้สามารถติดตามสุขภาพผิวหน้าและดูแนวโน้มความรุนแรงของสิวได้

โปรเจกต์นี้ใช้โครงสร้างแบบ **Monorepo** โดยแบ่งออกเป็นสองส่วนหลักคือ Frontend (Next.js) และ Backend/AI (FastAPI)

---

## Tech Stack & Architecture

### 1. Frontend: Web Application (`apps/web`)

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + custom UI components
- **Language:** TypeScript
- **State Management & Data Fetching:** React Hooks, Server Components, Server Actions
- **Database Access:** Prisma ORM เชื่อมต่อกับ MongoDB
- **Authentication:** NextAuth (Auth.js) สำหรับระบบ Login / Register

### 2. Backend: AI Service (`apps/ai`)

- **Framework:** FastAPI (Python)
- **AI Model:** YOLO (Ultralytics) สำหรับ Object Detection (ตรวจจับพิกัดและประเภทของสิว)
- **Core Function:** รับรูปภาพจาก Web Frontend -> ประมวลผลผ่านโมเดล YOLO -> ส่งกลับผลลัพธ์พิกัด (Bounding Boxes) และประเภทสิว
- **Execution:** ใช้ Virtual Environment (`venv`) และรันผ่าน Uvicorn

### 3. Database: MongoDB

- **Schema หลัก:**
  - `User`: เก็บข้อมูลผู้ใช้และรหัสผ่าน
  - `Model`: เก็บข้อมูลโมเดล AI (เวอร์ชัน, Path ของไฟล์ `.pt`, สถานะ)
  - `Analysis`: เก็บประวัติการวิเคราะห์สิว (ไฟล์รูปภาพ, ยอดสิวแต่ละประเภท, ระดับความรุนแรง, และวันที่)

### 4. Storage (`apps/storage`)

- ใช้โฟลเดอร์ Local สำหรับจัดเก็บไฟล์:
  - `uploads/`: เก็บไฟล์รูปภาพใบหน้าที่ผู้ใช้อัปโหลดเพื่อวิเคราะห์

### 5. Model (`apps/ai/models`)

- ใช้โฟลเดอร์ Local สำหรับจัดเก็บไฟล์:
  - `best.pt`: เก็บไฟล์โมเดล AI (YOLO)

---

## Key Features (ฟีเจอร์หลัก)

1. **Dashboard & Image Analysis (หน้าวิเคราะห์สิว)**
   - ผู้ใช้สามารถอัปโหลดรูปภาพ หรือลากวาง (Drag & Drop)
   - ระบบจะส่งรูปภาพไปให้ FastAPI วิเคราะห์
   - แสดงผลลัพธ์เป็นกล่องกรอบ (Bounding Boxes) วาดทับบนใบหน้าอย่างแม่นยำผ่าน HTML5 Canvas
   - สรุปผลความรุนแรง (Mild, Moderate, Severe) และจำนวนสิวแต่ละประเภท

2. **History (ประวัติการวิเคราะห์)**
   - ดูประวัติการวิเคราะห์ทั้งหมดได้ทั้งรูปแบบ **Grid (การ์ด)** และ **Table (ตาราง)**
   - มีระบบ Pagination และ Filters (เรียงตามวันที่, เลือกจำนวนแสดงผล)
   - มี Lightbox Modal สำหรับกดดูรายละเอียดของแต่ละรูปภาพย้อนหลัง (ซูมและเลื่อนดูได้)

3. **Admin Model Management (จัดการโมเดล)**
   - สำหรับแอดมิน เพื่ออัปโหลดและสลับใช้งานโมเดล AI (`.pt`) เวอร์ชันใหม่ๆ โดยไม่ต้องแก้โค้ด

---

## How to Run (การรันโปรเจกต์แบบ Local)

**1. รันฝั่ง AI (FastAPI)**

```bash
cd apps\ai
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**2. รันฝั่ง Web (Next.js)**

```bash
cd apps\web
npm run dev
```

_หมายเหตุ: จำเป็นต้องรันทั้งสองระบบควบคู่กัน เพื่อให้หน้าเว็บสามารถส่งรูปไปให้ AI ประมวลผลได้_

---

## Future Roadmap (สิ่งที่สามารถพัฒนาต่อได้)

- **Dashboard Overview:** หน้าแรกแสดงกราฟสรุปแนวโน้มสิวของผู้ใช้ว่าลดลงหรือเพิ่มขึ้น
- **Export Data:** ดาวน์โหลดผลประวัติการวิเคราะห์เป็น PDF
- **Mobile Responsive Polish:** ปรับ UI เพิ่มเติมให้แสดงผลบนมือถือได้อย่างสมบูรณ์แบบ
