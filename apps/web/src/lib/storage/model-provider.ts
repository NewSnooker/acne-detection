import { createReadStream } from "fs";
import { rm, stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";

// ไฟล์โมเดลแบบเก่า: provider "file" = ไฟล์ในโฟลเดอร์ MODEL_STORAGE_PATH ของเครื่องที่อัปโหลด
// โมเดลใหม่เก็บแบบหั่นชิ้นใน MongoDB (server/model-chunks.ts) ไฟล์นี้เหลือไว้อ่าน/ลบของเดิม

function storageDir(): string | null {
  const dir = process.env.MODEL_STORAGE_PATH?.trim();
  return dir ? path.resolve(dir) : null;
}

/** path ของไฟล์โมเดลในโฟลเดอร์ที่เก็บ — กันชื่อไฟล์ที่พาออกนอกโฟลเดอร์ */
function resolveStoredFile(fileName: string): string {
  const dir = storageDir();
  if (!dir) throw new Error("MODEL_STORAGE_PATH is not set");
  const full = path.resolve(dir, fileName);
  if (path.dirname(full) !== dir) throw new Error("Invalid model file name");
  return full;
}

/** เปิดไฟล์โมเดลที่เก็บแบบ "file" เพื่อส่งต่อ — คืน null ถ้าไม่พบไฟล์ */
export async function openModelFile(
  filePath: string,
): Promise<{ stream: ReadableStream<Uint8Array>; size: number } | null> {
  const full = resolveStoredFile(filePath);
  const info = await stat(full).catch(() => null);
  if (!info?.isFile()) return null;
  const stream = Readable.toWeb(
    createReadStream(full),
  ) as ReadableStream<Uint8Array>;
  return { stream, size: info.size };
}

export async function deleteModelFile(
  provider: string,
  filePath: string,
): Promise<void> {
  // แบบ mongodb: ลบ record = ลบข้อมูลไปด้วยแล้ว
  if (provider !== "file" || !filePath) return;
  await rm(resolveStoredFile(filePath), { force: true });
}
