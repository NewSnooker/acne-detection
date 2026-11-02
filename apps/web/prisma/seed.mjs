// ─── ข้อมูลเริ่มต้นของระบบ ──────────────────────────────────
// รันอัตโนมัติทุกครั้งที่ container web เริ่มทำงาน (ดู Dockerfile)
// หรือรันเองด้วย:  npm run db:seed
//
// ทำซ้ำได้ ไม่สร้างข้อมูลซ้ำ:
// 1) ถ้ายังไม่มีผู้ดูแลระบบ → สร้างบัญชีแอดมินเริ่มต้น
// 2) ถ้ายังไม่มีโมเดล AI   → ใส่โมเดลเริ่มต้นจาก prisma/seed/acne-default.pt
// 3) โมเดลเพิ่มเติมในโฟลเดอร์ prisma/seed/extra/*.pt (ไม่ขึ้น git — ไฟล์ใหญ่ เช่นโมเดล L)
//    → ใส่ตัวที่ยังไม่มี เก็บตาม MODEL_STORAGE (file = คัดลอกลง MODEL_STORAGE_PATH, mongodb ≤ 15 MB)
//    ตั้ง SEED_ACTIVE_MODEL=<ชื่อไฟล์> ให้ตัวนั้นเป็นโมเดลหลัก (เช่น acne14k_l_960.pt)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@acne.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin1234";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Administrator";
const MODEL_PATH =
  process.env.SEED_MODEL_PATH || path.join(here, "seed", "acne-default.pt");
const EXTRA_DIR =
  process.env.SEED_EXTRA_MODELS_DIR || path.join(here, "seed", "extra");
const ACTIVE_MODEL = process.env.SEED_ACTIVE_MODEL?.trim();
// ตรงกับ lib/storage/config.ts (MODEL_STORAGE, MONGODB_MODEL_LIMIT)
const MODEL_STORAGE =
  process.env.MODEL_STORAGE?.trim() ||
  (process.env.MODEL_STORAGE_PATH?.trim() ? "file" : "mongodb");
const MONGODB_MODEL_LIMIT = 15 * 1024 * 1024;

async function seedAdmin() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (admin) {
    console.log(`[seed] มีผู้ดูแลระบบอยู่แล้ว (${admin.email}) ข้าม`);
    return admin;
  }

  const sameEmail = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (sameEmail) {
    console.warn(
      `[seed] อีเมล ${ADMIN_EMAIL} ถูกใช้โดยบัญชีที่ไม่ใช่แอดมิน จึงไม่สร้างแอดมินเริ่มต้น`,
    );
    return null;
  }

  const created = await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: "ADMIN",
    },
  });
  console.log(`[seed] สร้างบัญชีแอดมินเริ่มต้น: ${ADMIN_EMAIL}`);
  return created;
}

async function seedModel(admin) {
  const modelCount = await prisma.aiModel.count();
  if (modelCount > 0) {
    console.log(`[seed] มีโมเดลอยู่แล้ว ${modelCount} ตัว ข้าม`);
    return;
  }
  if (!admin) {
    console.warn(
      "[seed] ไม่มีแอดมินสำหรับเป็นเจ้าของโมเดล ข้ามการใส่โมเดลเริ่มต้น",
    );
    return;
  }
  if (!fs.existsSync(MODEL_PATH)) {
    console.warn(`[seed] ไม่พบไฟล์โมเดลเริ่มต้นที่ ${MODEL_PATH} ข้าม`);
    return;
  }

  // Prisma Bytes ต้องส่งเป็น Buffer
  const buffer = fs.readFileSync(MODEL_PATH);
  const sizeMb = parseFloat((buffer.length / (1024 * 1024)).toFixed(2));

  await prisma.aiModel.create({
    data: {
      name: "AcneAI Default",
      version: "1.0",
      description: "โมเดลเริ่มต้นที่มากับระบบ",
      filePath: "",
      modelData: buffer,
      provider: "mongodb",
      fileName: path.basename(MODEL_PATH),
      sizeMb,
      isActive: true,
      uploadedBy: admin.id,
    },
  });
  console.log(`[seed] ใส่โมเดลเริ่มต้นแล้ว (${sizeMb} MB)`);
}

/** ชื่อที่เก็บของโมเดลเพิ่มเติม — ขึ้นต้นด้วย seed_ ไว้เช็คว่าเคยใส่แล้วหรือยัง */
function extraFileName(originalName) {
  return `seed_${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
}

async function seedExtraModels(admin) {
  if (!fs.existsSync(EXTRA_DIR)) return;
  const files = fs
    .readdirSync(EXTRA_DIR)
    .filter((name) => name.toLowerCase().endsWith(".pt"))
    .sort();
  if (files.length === 0) return;
  if (!admin) {
    console.warn("[seed] ไม่มีแอดมินสำหรับเป็นเจ้าของโมเดล ข้ามโมเดลเพิ่มเติม");
    return;
  }

  for (const original of files) {
    const fileName = extraFileName(original);
    const existing = await prisma.aiModel.findFirst({
      where: { fileName },
      select: { id: true },
    });
    if (existing) {
      console.log(`[seed] มีโมเดล ${original} อยู่แล้ว ข้าม`);
      continue;
    }

    const source = path.join(EXTRA_DIR, original);
    const size = fs.statSync(source).size;
    const sizeMb = parseFloat((size / (1024 * 1024)).toFixed(2));
    const stored = { filePath: "", modelData: null, provider: MODEL_STORAGE };

    if (MODEL_STORAGE === "file") {
      const dir = process.env.MODEL_STORAGE_PATH?.trim();
      if (!dir) {
        console.warn("[seed] MODEL_STORAGE=file แต่ไม่ได้ตั้ง MODEL_STORAGE_PATH ข้ามโมเดลเพิ่มเติม");
        return;
      }
      fs.mkdirSync(path.resolve(dir), { recursive: true });
      // คัดลอกแบบ stream ในตัว ไม่อ่านทั้งไฟล์เข้าหน่วยความจำ
      fs.copyFileSync(source, path.resolve(dir, fileName));
      stored.filePath = fileName;
    } else if (MODEL_STORAGE === "mongodb") {
      if (size > MONGODB_MODEL_LIMIT) {
        console.warn(
          `[seed] ${original} (${sizeMb} MB) ใหญ่เกิน 15 MB เก็บในฐานข้อมูลไม่ได้ ข้าม (ใช้ MODEL_STORAGE=file)`,
        );
        continue;
      }
      stored.modelData = fs.readFileSync(source); // Prisma Bytes ต้องเป็น Buffer
    } else {
      console.warn(`[seed] MODEL_STORAGE=${MODEL_STORAGE} ไม่รองรับใน seed ข้ามโมเดลเพิ่มเติม`);
      return;
    }

    await prisma.aiModel.create({
      data: {
        name: original.replace(/\.pt$/i, ""),
        version: "1.0",
        description: "ใส่จาก prisma/seed/extra",
        ...stored,
        fileName,
        sizeMb,
        isActive: false,
        uploadedBy: admin.id,
      },
    });
    console.log(`[seed] ใส่โมเดล ${original} แล้ว (${sizeMb} MB, ${MODEL_STORAGE})`);
  }

  if (ACTIVE_MODEL) {
    const target = await prisma.aiModel.findFirst({
      where: { fileName: extraFileName(ACTIVE_MODEL) },
      select: { id: true, isActive: true },
    });
    if (!target) {
      console.warn(`[seed] ไม่พบโมเดล SEED_ACTIVE_MODEL=${ACTIVE_MODEL} ใน ${EXTRA_DIR}`);
    } else if (!target.isActive) {
      await prisma.$transaction([
        prisma.aiModel.updateMany({ where: { isActive: true }, data: { isActive: false } }),
        prisma.aiModel.update({ where: { id: target.id }, data: { isActive: true } }),
      ]);
      console.log(`[seed] ตั้ง ${ACTIVE_MODEL} เป็นโมเดลหลักแล้ว`);
    }
  }
}

async function main() {
  const admin = await seedAdmin();
  await seedModel(admin);
  await seedExtraModels(admin);
}

main()
  .catch((error) => {
    console.error("[seed] ล้มเหลว:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
