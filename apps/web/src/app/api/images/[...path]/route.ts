import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile, stat } from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: filePathArray } = await params;
    if (!filePathArray || filePathArray.length === 0) {
      return new NextResponse("File not found", { status: 404 });
    }

    // พยายามหา Root ของโปรเจกต์ (acne-ai-v2) หรือใช้ Absolute Path ตรงๆ
    let storageDir = process.env.STORAGE_PATH;
    
    if (!storageDir || !path.isAbsolute(storageDir)) {
      const cwd = process.cwd();
      if (cwd.endsWith("web")) {
        storageDir = path.resolve(cwd, "..", "..", "apps", "images");
      } else {
        storageDir = path.resolve(cwd, "apps", "images");
      }
    }

    const absoluteFilePath = path.join(storageDir, ...filePathArray);

    // ตรวจสอบความปลอดภัย ป้องกัน Path Traversal
    if (!absoluteFilePath.startsWith(storageDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // เช็คว่าไฟล์มีจริงไหม
    const fileStat = await stat(absoluteFilePath);
    if (!fileStat.isFile()) {
      return new NextResponse("Not a file", { status: 404 });
    }

    const fileBuffer = await readFile(absoluteFilePath);

    // หานามสกุลไฟล์เพื่อเซ็ต Content-Type
    const ext = path.extname(absoluteFilePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    return new NextResponse("File not found", { status: 404 });
  }
}
