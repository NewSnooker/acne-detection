import { put, del } from "@vercel/blob";
import fs from "fs";
import path from "path";

export type ImageUploadResult = {
  originalImage: string; // fileName (local) or blob pathname (vercel-blob)
  imageUrl: string | null; // null for local, public URL for vercel-blob
  imageProvider: "local" | "vercel-blob";
};

// ─── Helper ────────────────────────────────────────────────────

function getStoragePath() {
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

export async function uploadImage(file: File): Promise<ImageUploadResult> {
  const isHosted = process.env.APP_ENV === "hosted";
  const buffer = Buffer.from(await file.arrayBuffer());
  const crypto = await import("crypto");
  const uuid = crypto.randomUUID();
  const extension = file.name.split(".").pop() || "jpg";
  const fileName = `acne-ai/${uuid}.${extension}`;

  if (isHosted) {
    // ─── Hosted: อัปโหลดขึ้น Vercel Blob (Internal Network → เร็วมาก)
    // put() จะ Return URL กลับมาทันที ไม่ต้องทำ Background Job
    console.log(`[Image Upload] Uploading to Vercel Blob: ${fileName}`);
    const blob = await put(fileName, buffer, {
      access: "public",
      contentType: file.type || "image/jpeg",
    });
    console.log(`[Image Upload] Vercel Blob upload success: ${blob.url}`);

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
    console.log(`[Image Upload] Saved to local disk: ${filePath}`);

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
  if (provider === "vercel-blob") {
    // ─── Delete from Vercel Blob ───
    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn(`[Image Delete] Skipped Vercel Blob delete (${originalImage}): BLOB_READ_WRITE_TOKEN is missing.`);
        return;
      }
      const target = imageUrl || originalImage;
      await del(target);
      console.log(`[Image Delete] Deleted from Vercel Blob: ${target}`);
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
        console.log(`[Image Delete] Deleted from local disk: ${filePath}`);
      }
    } catch (fsError) {
      console.error("[Image Delete] Failed to delete local image file:", fsError);
    }
  }
}
