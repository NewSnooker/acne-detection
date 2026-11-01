import { createReadStream, createWriteStream } from "fs";
import { mkdir, rm, stat } from "fs/promises";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { HttpError } from "@/lib/http-error";

// ที่เก็บไฟล์โมเดล .pt มี 2 แบบ
// - "file": เขียนลงโฟลเดอร์ MODEL_STORAGE_PATH แบบ stream ไม่จำกัดขนาด (Docker / Azure / รันในเครื่อง)
// - "mongodb": เก็บในฟิลด์ AiModel.modelData ใช้เมื่อไม่ได้ตั้ง MODEL_STORAGE_PATH (เช่น Vercel)
//   เอกสาร MongoDB ใหญ่ได้ไม่เกิน 16 MB จึงรับไฟล์ได้ไม่เกิน MONGODB_MODEL_LIMIT
export type ModelProvider = "file" | "mongodb";

export type ModelUploadResult = {
  filePath: string;
  modelData: Buffer<ArrayBuffer> | null; // Prisma Bytes ต้องเป็น Buffer (ห้าม Uint8Array)
  provider: ModelProvider;
  sizeBytes: number;
};

export const MONGODB_MODEL_LIMIT = 15 * 1024 * 1024;

const MONGODB_TOO_LARGE =
  "ไฟล์โมเดลใหญ่เกิน 15 MB เก็บในฐานข้อมูลไม่ได้ ต้องตั้งค่า MODEL_STORAGE_PATH ให้เก็บเป็นไฟล์ (ดูคู่มือการตั้งค่า)";

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

/** นับขนาดระหว่าง stream ผ่าน และหยุดทันทีถ้าเกิน limit */
function byteCounter(limit: number) {
  let total = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _enc, done) {
      total += chunk.length;
      if (total > limit) return done(new HttpError(413, MONGODB_TOO_LARGE));
      done(null, chunk);
    },
  });
  return { counter, size: () => total };
}

export async function saveModel(
  body: WebReadableStream<Uint8Array>,
  fileName: string,
): Promise<ModelUploadResult> {
  const source = Readable.fromWeb(body);

  if (storageDir()) {
    const target = resolveStoredFile(fileName);
    await mkdir(path.dirname(target), { recursive: true });
    const { counter, size } = byteCounter(Number.POSITIVE_INFINITY);
    try {
      await pipeline(source, counter, createWriteStream(target));
    } catch (error) {
      await rm(target, { force: true });
      throw error;
    }
    return {
      filePath: fileName,
      modelData: null,
      provider: "file",
      sizeBytes: size(),
    };
  }

  const { counter, size } = byteCounter(MONGODB_MODEL_LIMIT);
  const chunks: Buffer[] = [];
  await pipeline(source, counter, async function* (input) {
    for await (const chunk of input) chunks.push(chunk as Buffer);
  });
  return {
    filePath: "",
    modelData: Buffer.concat(chunks),
    provider: "mongodb",
    sizeBytes: size(),
  };
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
