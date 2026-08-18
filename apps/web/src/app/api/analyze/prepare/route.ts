import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage/image-provider";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
    }

    // 1. Find active model
    const activeModel = await prisma.aiModel.findFirst({
      where: { isActive: true },
    });

    if (!activeModel) {
      return NextResponse.json(
        { error: "ไม่มีโมเดลที่กำลังเปิดใช้งานอยู่ในระบบ กรุณาติดต่อแอดมิน" },
        { status: 404 }
      );
    }

    // 2. Save image using Image Provider
    const imageResult = await uploadImage(file);

    // 3. Prepare URLs for FastAPI
    const appUrl =
      process.env.INTERNAL_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const activeModelPath = `${appUrl}/api/models/${activeModel.id}`;

    let imageUrlOrPath = "";
    if (imageResult.imageProvider === "cloudinary" && imageResult.imageUrl) {
      imageUrlOrPath = imageResult.imageUrl;
    } else {
      const storagePath =
        process.env.STORAGE_PATH ||
        path.resolve(process.cwd(), "apps", "images");
      imageUrlOrPath = path.join(storagePath, imageResult.originalImage);
    }

    // 4. Return data needed for WebSocket
    return NextResponse.json({
      success: true,
      data: {
        imageUrlOrPath: imageUrlOrPath,
        modelUrlOrPath: activeModelPath,
        imageName: imageResult.originalImage,
        imageUrl: imageResult.imageUrl, // Web URL for preview if cloudinary
        imageProvider: imageResult.imageProvider,
        modelId: activeModel.id,
      },
    });
  } catch (error) {
    console.error("Error in prepare upload:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ" },
      { status: 500 }
    );
  }
}
