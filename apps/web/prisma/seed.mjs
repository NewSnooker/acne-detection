// ─── ข้อมูลเริ่มต้นของระบบ ──────────────────────────────────
// รันอัตโนมัติทุกครั้งที่ container web เริ่มทำงาน (ดู Dockerfile)
// หรือรันเองด้วย:  npm run db:seed
//
// ทำซ้ำได้ ไม่สร้างข้อมูลซ้ำ:
// 1) ถ้ายังไม่มีผู้ดูแลระบบ → สร้างบัญชีแอดมินเริ่มต้น
//    ยกเว้นเว็บจริง (ฐานข้อมูล Atlas) ที่ไม่ได้ตั้ง SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD
//    → ไม่สร้าง admin@acne.local / Admin1234 (รหัสนี้อยู่ในคู่มือ ใครก็เดาได้)
// 2) ถ้ายังไม่มีโมเดล AI   → ใส่โมเดลเริ่มต้นจาก prisma/seed/acne-default.pt
// 3) เติมค่าเริ่มต้นให้ข้อมูลเก่าที่ยังไม่มีช่องใหม่ (MongoDB ไม่เติม @default ให้ document ที่มีอยู่แล้ว)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@acne.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin1234";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Administrator";
const MODEL_PATH =
  process.env.SEED_MODEL_PATH || path.join(here, "seed", "acne-default.pt");

// ฐานข้อมูล Atlas = เว็บที่เปิดให้คนนอกเข้า (Docker / npm run dev ใช้ mongodb:// ในเครื่อง)
const IS_HOSTED_DB = (process.env.DATABASE_URL ?? "").startsWith(
  "mongodb+srv://",
);
const HAS_OWN_ADMIN =
  Boolean(process.env.SEED_ADMIN_EMAIL) &&
  Boolean(process.env.SEED_ADMIN_PASSWORD);

async function seedAdmin() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (admin) {
    console.log(`[seed] มีผู้ดูแลระบบอยู่แล้ว (${admin.email}) ข้าม`);
    return admin;
  }

  if (IS_HOSTED_DB && !HAS_OWN_ADMIN) {
    console.warn(
      "[seed] ยังไม่มีผู้ดูแลระบบ แต่ไม่สร้างแอดมินเริ่มต้นบนเว็บจริง (ไม่ได้ตั้ง SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD) — " +
        "สมัครสมาชิกผ่านหน้าเว็บ แล้วแก้ role ของบัญชีเป็น ADMIN ในฐานข้อมูล (collection User) จากนั้นออกจากระบบแล้วเข้าใหม่ (สิทธิ์ถูกเก็บใน session ตอนเข้าสู่ระบบ)",
    );
    return null;
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

// ช่องที่เพิ่มทีหลัง: document เก่าไม่มีช่องนี้ ถ้าไม่เติม Prisma อาจอ่านไม่ได้
const BACKFILL = [
  { collection: "AiModel", field: "useTta", value: false },
  { collection: "AiModel", field: "confidence", value: 0.2 },
  { collection: "Analysis", field: "usedTta", value: false },
];

async function backfillNewFields() {
  for (const { collection, field, value } of BACKFILL) {
    const result = await prisma.$runCommandRaw({
      update: collection,
      updates: [
        {
          q: { [field]: { $exists: false } },
          u: { $set: { [field]: value } },
          multi: true,
        },
      ],
    });
    const count = Number(result.nModified ?? 0);
    if (count > 0) {
      console.log(
        `[seed] เติม ${collection}.${field} = ${value} ให้ ${count} รายการ`,
      );
    }
  }
}

async function main() {
  await backfillNewFields();
  const admin = await seedAdmin();
  await seedModel(admin);
}

main()
  .catch((error) => {
    console.error("[seed] ล้มเหลว:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
