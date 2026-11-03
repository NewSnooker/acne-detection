import "server-only";
import {
  BlobSASPermissions,
  BlobServiceClient,
  type ContainerClient,
} from "@azure/storage-blob";
import { Readable } from "stream";

// ที่เก็บไฟล์บน Azure Blob Storage (IMAGE_STORAGE / MODEL_STORAGE = azure-blob)
// container เป็น private ทั้งหมด:
// - เบราว์เซอร์ดูรูปผ่าน /api/images/<ชื่อไฟล์> (เช็คสิทธิ์เจ้าของรูปก่อน)
// - ai โหลดรูปด้วยลิงก์ SAS อ่านอย่างเดียว อายุสั้น
// - ai โหลดโมเดลผ่าน GET /api/models/[id] เหมือนทุก environment

export type BlobKind = "images" | "models";

/** อายุลิงก์ SAS ที่ส่งให้ ai โหลดรูป (นาที) */
const SAS_MINUTES = 10;
/** ขนาดก้อนตอนอัปโหลดไฟล์ใหญ่แบบ stream */
const UPLOAD_BUFFER_BYTES = 4 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 4;

let service: BlobServiceClient | null = null;
const ready = new Map<BlobKind, Promise<ContainerClient>>();

function containerName(kind: BlobKind): string {
  const name =
    kind === "images"
      ? process.env.AZURE_STORAGE_IMAGE_CONTAINER
      : process.env.AZURE_STORAGE_MODEL_CONTAINER;
  return name?.trim() || kind;
}

function serviceClient(): BlobServiceClient {
  if (service) return service;
  const connection = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!connection) {
    throw new Error("azure-blob ต้องตั้ง AZURE_STORAGE_CONNECTION_STRING");
  }
  service = BlobServiceClient.fromConnectionString(connection);
  return service;
}

/** container ของรูปหรือโมเดล — สร้างให้ (แบบ private) ถ้ายังไม่มี */
function container(kind: BlobKind): Promise<ContainerClient> {
  let pending = ready.get(kind);
  if (!pending) {
    const client = serviceClient().getContainerClient(containerName(kind));
    pending = client.createIfNotExists().then(() => client);
    pending.catch(() => ready.delete(kind));
    ready.set(kind, pending);
  }
  return pending;
}

async function blob(kind: BlobKind, name: string) {
  return (await container(kind)).getBlockBlobClient(name);
}

export async function uploadBlobBuffer(
  kind: BlobKind,
  name: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  await (
    await blob(kind, name)
  ).uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } });
}

/** อัปโหลดแบบ stream ไม่โหลดทั้งไฟล์เข้าหน่วยความจำ (ไฟล์โมเดลหลายสิบ MB) */
export async function uploadBlobStream(
  kind: BlobKind,
  name: string,
  data: Readable,
  contentType: string,
): Promise<void> {
  await (
    await blob(kind, name)
  ).uploadStream(data, UPLOAD_BUFFER_BYTES, UPLOAD_CONCURRENCY, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
}

/** เปิดไฟล์เพื่อส่งต่อ — คืน null ถ้าไม่พบ */
export async function openBlob(
  kind: BlobKind,
  name: string,
): Promise<{ stream: ReadableStream<Uint8Array>; size: number } | null> {
  const client = await blob(kind, name);
  try {
    const response = await client.download();
    if (!response.readableStreamBody) return null;
    const stream = Readable.toWeb(
      Readable.from(response.readableStreamBody),
    ) as ReadableStream<Uint8Array>;
    return { stream, size: response.contentLength ?? 0 };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteBlob(kind: BlobKind, name: string): Promise<void> {
  await (await blob(kind, name)).deleteIfExists();
}

/** ลิงก์อ่านอย่างเดียวอายุสั้น ให้ ai ดาวน์โหลดรูป */
export async function readOnlyBlobUrl(
  kind: BlobKind,
  name: string,
): Promise<string> {
  return (await blob(kind, name)).generateSasUrl({
    permissions: BlobSASPermissions.parse("r"),
    startsOn: new Date(Date.now() - 60_000), // เผื่อนาฬิกาเครื่องคลาดเคลื่อน
    expiresOn: new Date(Date.now() + SAS_MINUTES * 60_000),
  });
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    error.statusCode === 404
  );
}
