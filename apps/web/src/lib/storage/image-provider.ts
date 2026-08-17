import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// ─── Cloudinary Config ────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type ImageUploadResult = {
  originalImage: string; // fileName (local) or public_id (cloudinary)
  imageUrl: string | null;
  imageProvider: "local" | "cloudinary";
};

// ─── Image Provider Abstraction ────────────────────────────────

export async function uploadImage(file: File): Promise<ImageUploadResult> {
  const isHosted = process.env.APP_ENV === "hosted";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isHosted) {
    // ─── Upload to Cloudinary ───
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "acne-ai" },
        (error, result) => {
          if (error || !result) {
            console.error("Cloudinary Upload Error:", error);
            reject(error || new Error("Failed to upload to Cloudinary"));
          } else {
            resolve({
              originalImage: result.public_id,
              imageUrl: result.secure_url,
              imageProvider: "cloudinary",
            });
          }
        },
      );
      uploadStream.end(buffer);
    });
  } else {
    // ─── Save to Local Disk ───
    const crypto = await import("crypto");
    const uuid = crypto.randomUUID();
    // Default fallback path if STORAGE_PATH is not set
    let storagePath = process.env.STORAGE_PATH;
    if (!storagePath || !path.isAbsolute(storagePath)) {
      const cwd = process.cwd();
      if (cwd.endsWith("web")) {
        storagePath = path.resolve(cwd, "..", "..", "apps", "images");
      } else {
        storagePath = path.resolve(cwd, "apps", "images");
      }
    }

    // Ensure directory exists
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `${uuid}.${extension}`;
    const filePath = path.join(storagePath, fileName);
    
    await fs.promises.writeFile(filePath, buffer);

    return {
      originalImage: fileName,
      imageUrl: null,
      imageProvider: "local",
    };
  }
}

export async function deleteImage(
  originalImage: string,
  provider: string,
): Promise<void> {
  if (provider === "cloudinary") {
    // ─── Delete from Cloudinary ───
    try {
      await cloudinary.uploader.destroy(originalImage);
    } catch (error) {
      console.error("Failed to delete image from Cloudinary:", error);
    }
  } else {
    // ─── Delete from Local Disk ───
    try {
      let storagePath = process.env.STORAGE_PATH;
      if (!storagePath || !path.isAbsolute(storagePath)) {
        const cwd = process.cwd();
        if (cwd.endsWith("web")) {
          storagePath = path.resolve(cwd, "..", "..", "apps", "images");
        } else {
          storagePath = path.resolve(cwd, "apps", "images");
        }
      }
      
      const filePath = path.join(storagePath, originalImage);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (fsError) {
      console.error("Failed to delete local image file:", fsError);
    }
  }
}
