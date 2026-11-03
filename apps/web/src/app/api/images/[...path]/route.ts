import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile, stat } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/guards";
import { imageStorage } from "@/lib/storage/config";
import { getStoragePath, openAzureImage } from "@/lib/storage/image-provider";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp", // รูปเก่าที่บันทึกไว้ก่อนจำกัดชนิดไฟล์
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    // 1. ต้องเข้าสู่ระบบ
    const guard = await requireUserApi();
    if (!guard.ok) return guard.response;
    const { user } = guard.session;

    const { path: filePathArray } = await params;
    if (!filePathArray || filePathArray.length === 0) {
      return new NextResponse("File not found", { status: 404 });
    }

    // 2. กัน path traversal: ไฟล์ต้องอยู่ใต้โฟลเดอร์เก็บรูปจริง ๆ
    const storageDir = getStoragePath();
    const absoluteFilePath = path.resolve(storageDir, ...filePathArray);
    const relative = path.relative(storageDir, absoluteFilePath);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // 3. ดูได้เฉพาะรูปของตัวเอง (ผู้ดูแลระบบดูได้ทุกรูป)
    //    ตอบ 404 เหมือนไม่มีไฟล์ เพื่อไม่บอกว่ารูปของคนอื่นมีอยู่จริง
    if (user.role !== "ADMIN") {
      const fileName = filePathArray.join("/");
      const owned = await prisma.analysis.findFirst({
        where: { userId: user.id, image: { is: { fileName } } },
        select: { id: true },
      });
      if (!owned) {
        return new NextResponse("File not found", { status: 404 });
      }
    }

    const ext = path.extname(absoluteFilePath).toLowerCase();
    const headers = {
      "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
      // private: รูปเป็นข้อมูลส่วนตัว ห้าม cache ที่ตัวกลาง (proxy/CDN)
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    // Azure Blob (container private): เว็บดึงมาส่งต่อ ชื่อไฟล์ต้องไม่มีโฟลเดอร์ย่อย
    if (imageStorage() === "azure-blob") {
      if (filePathArray.length !== 1) {
        return new NextResponse("File not found", { status: 404 });
      }
      const stored = await openAzureImage(filePathArray[0]);
      if (!stored) {
        return new NextResponse("File not found", { status: 404 });
      }
      return new NextResponse(stored.stream, {
        headers: { ...headers, "Content-Length": stored.size.toString() },
      });
    }

    const fileStat = await stat(absoluteFilePath);
    if (!fileStat.isFile()) {
      return new NextResponse("Not a file", { status: 404 });
    }

    const fileBuffer = await readFile(absoluteFilePath);
    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    return new NextResponse("File not found", { status: 404 });
  }
}
