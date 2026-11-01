// ─── ล้างข้อมูลที่ปนข้าม environment ────────────────────────
// ใช้ครั้งเดียวกับฐานข้อมูลบนคลาวด์ (Atlas) ที่เคยถูกเครื่องนักพัฒนาต่อเข้ามาตรง ๆ
// ข้อมูลพวกนี้ชี้ไปหาไฟล์ที่อยู่บนเครื่องอื่น เว็บที่ deploy จึงเปิดไม่ได้ (ดู dev-docs/environments.md)
//
//   npm run db:cleanup              ← ดูรายการก่อน (ไม่ลบอะไร)
//   npm run db:cleanup -- --apply   ← ลบจริง
//
// สิ่งที่ลบ:
// 1) ประวัติการวิเคราะห์ที่รูปเก็บบนดิสก์ (Image.provider = "local")
// 2) โมเดลที่ไฟล์อยู่บนดิสก์ของเครื่องอื่น (provider "file") หรือแบบหั่นชิ้นที่เลิกใช้แล้ว ("chunks")
//    — ข้ามโมเดลหลัก ให้ตั้งโมเดลอื่นเป็นโมเดลหลักก่อน
// 3) collection AiModelChunk (ชิ้นไฟล์โมเดลแบบเลิกใช้)
import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");
const prisma = new PrismaClient();

function databaseLabel(url = "") {
  const match = url.match(/@([^/]+)\/([^?]*)/);
  return match ? `${match[1]} / ${match[2] || "(default)"}` : "(ไม่ทราบ)";
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  // ฐานข้อมูลของ Docker ใช้ไฟล์บนดิสก์ถูกต้องอยู่แล้ว ห้ามล้าง
  if (!url.startsWith("mongodb+srv://") && !force) {
    console.error(
      "[cleanup] DATABASE_URL ไม่ใช่ฐานข้อมูลบนคลาวด์ (mongodb+srv) — ฐานข้อมูลของ Docker ไม่ต้องล้าง\n" +
        "          ถ้าแน่ใจให้เพิ่ม --force",
    );
    process.exitCode = 1;
    return;
  }
  console.log(`[cleanup] ฐานข้อมูล: ${databaseLabel(url)}`);
  console.log(
    apply
      ? "[cleanup] โหมดลบจริง"
      : "[cleanup] โหมดดูรายการ (เพิ่ม --apply เพื่อลบ)",
  );

  // 1) ประวัติที่รูปอยู่บนดิสก์ของเครื่องอื่น
  const localImages = await prisma.image.findMany({
    where: { provider: "local" },
    select: { id: true, fileName: true, createdAt: true },
  });
  console.log(`\n1) ประวัติที่รูปเก็บบนดิสก์: ${localImages.length} รายการ`);
  for (const image of localImages.slice(0, 10)) {
    console.log(`   - ${image.createdAt.toISOString()} ${image.fileName}`);
  }
  if (localImages.length > 10)
    console.log(`   ... และอีก ${localImages.length - 10} รายการ`);

  // 2) โมเดลที่เว็บนี้เปิดไฟล์ไม่ได้
  const models = await prisma.aiModel.findMany({
    where: { provider: { in: ["file", "chunks"] } },
    select: {
      id: true,
      name: true,
      version: true,
      provider: true,
      isActive: true,
    },
  });
  const removable = models.filter((m) => !m.isActive);
  console.log(`\n2) โมเดลที่ไฟล์อยู่ที่อื่น: ${models.length} ตัว`);
  for (const m of models) {
    console.log(
      `   - ${m.name} v${m.version} (${m.provider})${m.isActive ? "  ← โมเดลหลัก ข้าม (ตั้งตัวอื่นเป็นโมเดลหลักก่อน)" : ""}`,
    );
  }

  // 3) collection ชิ้นไฟล์ที่เลิกใช้
  const collections = await prisma.$runCommandRaw({
    listCollections: 1,
    nameOnly: true,
    filter: { name: "AiModelChunk" },
  });
  const hasChunks = collections?.cursor?.firstBatch?.length > 0;
  console.log(
    `\n3) collection AiModelChunk: ${hasChunks ? "มี (จะลบทิ้ง)" : "ไม่มี"}`,
  );

  if (!apply) {
    console.log(
      "\n[cleanup] ยังไม่ได้ลบอะไร — ตรวจรายการแล้วรันซ้ำพร้อม --apply",
    );
    return;
  }

  if (localImages.length > 0) {
    // ลบ Image → Analysis ถูกลบตาม (onDelete: Cascade) — ไฟล์รูปอยู่เครื่องอื่น ไม่ต้องลบไฟล์
    for (const image of localImages) {
      await prisma.image.delete({ where: { id: image.id } });
    }
  }
  if (removable.length > 0) {
    const ids = removable.map((m) => m.id);
    await prisma.analysis.updateMany({
      where: { modelId: { in: ids } },
      data: { modelId: null },
    });
    await prisma.aiModel.deleteMany({
      where: { id: { in: ids }, isActive: false },
    });
  }
  if (hasChunks) {
    await prisma.$runCommandRaw({ drop: "AiModelChunk" });
  }
  console.log(
    `\n[cleanup] ลบแล้ว: ประวัติ ${localImages.length} รายการ, โมเดล ${removable.length} ตัว${hasChunks ? ", collection AiModelChunk" : ""}`,
  );
}

main()
  .catch((error) => {
    console.error("[cleanup] ล้มเหลว:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
