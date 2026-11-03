import { put, del } from "@vercel/blob";
import fs from "fs";
import path from "path";
import { imageStorage, type ImageStorage } from "@/lib/storage/config";
import {
  deleteBlob,
  openBlob,
  readOnlyBlobUrl,
  uploadBlobBuffer,
} from "@/lib/storage/azure-blob";

export type ImageUploadResult = {
  // ชื่อไฟล์ (local, azure-blob) หรือ blob pathname (vercel-blob)
  originalImage: string;
  // URL สาธารณะ (vercel-blob) — local / azure-blob เป็น null เบราว์เซอร์ดูผ่าน /api/images/<ชื่อไฟล์>
  imageUrl: string | null;
  imageProvider: ImageStorage;
};

// ─── Helper ────────────────────────────────────────────────────

export function getStoragePath() {
  let storagePath = process.env.STORAGE_PATH;
  if (!storagePath || !path.isAbsolute(storagePath)) {
    const cwd = process.cwd();
    if (cwd.endsWith("web")) {
      storagePath = path.resolve(cwd, "..", "..", "apps", "images");
    } else {
      storagePath = path.resolve(cwd, "apps", "images");
    }
  }
  return storagePath;
}

// ─── Image Provider Abstraction ────────────────────────────────

export async function uploadImage(
  file: File,
  kind: "jpeg" | "png",
): Promise<ImageUploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const crypto = await import("crypto");
  const uuid = crypto.randomUUID();
  // กำหนดนามสกุลจากชนิดไฟล์ที่ตรวจแล้ว ไม่ใช้ชื่อไฟล์ที่ผู้ใช้ส่งมา
  const extension = kind === "png" ? "png" : "jpg";
  const fileName = `acne-ai/${uuid}.${extension}`;
  const contentType = kind === "png" ? "image/png" : "image/jpeg";
  const storage = imageStorage();

  if (storage === "azure-blob") {
    // ─── Azure Blob (container private) ───
    const blobName = `${uuid}.${extension}`;
    await uploadBlobBuffer("images", blobName, buffer, contentType);
    return {
      originalImage: blobName,
      imageUrl: null,
      imageProvider: "azure-blob",
    };
  }

  if (storage === "vercel-blob") {
    // ─── Vercel Blob (Internal Network → เร็วมาก)
    // put() จะ Return URL กลับมาทันที ไม่ต้องทำ Background Job
    const blob = await put(fileName, buffer, {
      access: "public",
      contentType,
    });

    return {
      originalImage: blob.pathname, // เก็บ pathname ไว้ใช้ตอนลบ
      imageUrl: blob.url,
      imageProvider: "vercel-blob",
    };
  } else {
    // ─── Local/Docker: เซฟลง Shared Volume ───
    const storagePath = getStoragePath();
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    const localFileName = `${uuid}.${extension}`;
    const filePath = path.join(storagePath, localFileName);
    await fs.promises.writeFile(filePath, buffer);

    return {
      originalImage: localFileName,
      imageUrl: null,
      imageProvider: "local",
    };
  }
}

export async function deleteImage(
  originalImage: string,
  provider: string,
  imageUrl?: string | null,
): Promise<void> {
  if (provider === "azure-blob") {
    try {
      await deleteBlob("images", originalImage);
    } catch (error) {
      console.error("[Image Delete] Failed to delete from Azure Blob:", error);
    }
  } else if (provider === "vercel-blob") {
    // ─── Delete from Vercel Blob ───
    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn(
          `[Image Delete] Skipped Vercel Blob delete (${originalImage}): BLOB_READ_WRITE_TOKEN is missing.`,
        );
        return;
      }
      const target = imageUrl || originalImage;
      await del(target);
    } catch (error) {
      console.error("[Image Delete] Failed to delete from Vercel Blob:", error);
    }
  } else {
    // ─── Delete from Local Disk ───
    try {
      const storagePath = getStoragePath();
      const filePath = path.join(storagePath, originalImage);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (fsError) {
      console.error(
        "[Image Delete] Failed to delete local image file:",
        fsError,
      );
    }
  }
}

/** ลิงก์ที่ ai ใช้ดาวน์โหลดรูป — null = ส่งเป็น path บนดิสก์ร่วม (local) */
export async function imageUrlForAi(image: {
  originalImage: string;
  imageUrl?: string | null;
  imageProvider: ImageStorage;
}): Promise<string | null> {
  if (image.imageProvider === "azure-blob") {
    return readOnlyBlobUrl("images", image.originalImage);
  }
  return image.imageUrl ?? null;
}

/** เปิดรูปที่เก็บบน Azure Blob ให้ /api/images ส่งต่อ — null = ไม่พบ */
export function openAzureImage(fileName: string) {
  return openBlob("images", fileName);
}
