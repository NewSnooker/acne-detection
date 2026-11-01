/**
 * เลือกที่เก็บรูปและไฟล์โมเดลของระบบนี้จาก env — โค้ดส่วนอื่นห้ามเช็คชื่อ environment เอง
 * แต่ละ environment มีฐานข้อมูลและที่เก็บไฟล์ของตัวเอง (ดู dev-docs/environments.md)
 *
 * IMAGE_STORAGE: local (ดิสก์/Docker volume) | vercel-blob
 * MODEL_STORAGE: file (โฟลเดอร์ MODEL_STORAGE_PATH ไม่จำกัดขนาด) | mongodb (AiModel.modelData ≤ 15 MB)
 * ไม่ตั้ง = เดาจากค่าเดิม: APP_ENV=hosted → vercel-blob, มี MODEL_STORAGE_PATH → file
 */
export const IMAGE_STORAGES = ["local", "vercel-blob"] as const;
export const MODEL_STORAGES = ["file", "mongodb"] as const;
export type ImageStorage = (typeof IMAGE_STORAGES)[number];
export type ModelStorage = (typeof MODEL_STORAGES)[number];

const MB = 1024 * 1024;
/** เอกสาร MongoDB ใหญ่ได้ 16 MB เผื่อที่ให้ฟิลด์อื่น */
export const MONGODB_MODEL_LIMIT = 15 * MB;
/** Vercel รับ body ของคำขอได้ประมาณ 4.5 MB (ตั้งค่าแก้ไม่ได้) */
export const VERCEL_BODY_LIMIT = 4.5 * MB;

type Env = Record<string, string | undefined>;

function pick<T extends string>(
  env: Env,
  name: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  throw new Error(
    `${name}="${raw}" ไม่ถูกต้อง (ใช้ได้: ${allowed.join(", ")})`,
  );
}

export function imageStorage(env: Env = process.env): ImageStorage {
  return pick(
    env,
    "IMAGE_STORAGE",
    IMAGE_STORAGES,
    env.APP_ENV === "hosted" ? "vercel-blob" : "local",
  );
}

export function modelStorage(env: Env = process.env): ModelStorage {
  return pick(
    env,
    "MODEL_STORAGE",
    MODEL_STORAGES,
    env.MODEL_STORAGE_PATH?.trim() ? "file" : "mongodb",
  );
}

/** ขนาดไฟล์โมเดลสูงสุดที่อัปโหลดได้ (byte) — null = ไม่จำกัด */
export function maxModelUploadBytes(): number | null {
  if (modelStorage() === "file") return null;
  return process.env.VERCEL ? VERCEL_BODY_LIMIT : MONGODB_MODEL_LIMIT;
}

/** ชื่อ environment ที่แสดงให้แอดมินเห็น (ตั้งเองด้วย ENV_NAME ได้) */
export function environmentName(): string {
  const name = process.env.ENV_NAME?.trim();
  if (name) return name.toUpperCase();
  if (process.env.VERCEL) return "VERCEL";
  if (process.env.APP_ENV === "docker") return "DOCKER";
  return process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEV";
}

/**
 * ที่เก็บแบบดิสก์ (local / file) อยู่ได้แค่ในเครื่องเดียว ถ้าใช้คู่กับฐานข้อมูลบนคลาวด์ (mongodb+srv)
 * ฐานข้อมูลจะชี้ไปหาไฟล์ที่ environment อื่นเปิดไม่ได้ → ไม่ยอมเริ่มระบบ
 * (ตั้ง ALLOW_SHARED_DB=true ถ้าตั้งใจจริง)
 */
export function storageConfigProblem(env: Env = process.env): string | null {
  const database = env.DATABASE_URL ?? "";
  if (!database.startsWith("mongodb+srv://")) return null;
  if (env.ALLOW_SHARED_DB === "true") return null;

  const diskStores = [
    imageStorage(env) === "local" && "IMAGE_STORAGE=local",
    modelStorage(env) === "file" && "MODEL_STORAGE=file",
  ].filter(Boolean);
  if (diskStores.length === 0) return null;
  return (
    `ตั้งค่าไม่ปลอดภัย: ${diskStores.join(" และ ")} เก็บไฟล์บนดิสก์ของเครื่องนี้ ` +
    `แต่ DATABASE_URL เป็นฐานข้อมูลบนคลาวด์ที่ environment อื่นใช้ด้วย ` +
    `→ ใช้ฐานข้อมูลของเครื่องนี้เอง (เช่น MongoDB ใน Docker) หรือตั้ง ALLOW_SHARED_DB=true ถ้าตั้งใจ`
  );
}
