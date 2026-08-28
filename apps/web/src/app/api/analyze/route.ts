import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage/image-provider";
import { callFastApiForPrediction, calculateSeverity } from "@/lib/services/analyze-logic";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    // 1. เช็คสิทธิ์การเข้าใช้งาน และตรวจสอบว่ามี User อยู่จริงใน DB
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "ไม่พบบัญชีผู้ใช้งานในระบบ (Session ไม่ถูกต้องหรือฐานข้อมูลถูกรีเซ็ต) กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }

    // 2. รับไฟล์รูปภาพจาก Request
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
    }

    // 3. หาโมเดลที่ทำงานอยู่ (Active Model)
    const activeModel = await prisma.aiModel.findFirst({
      where: { isActive: true },
    });

    if (!activeModel) {
      return NextResponse.json(
        { error: "ไม่มีโมเดลที่กำลังเปิดใช้งานอยู่ในระบบ กรุณาติดต่อแอดมิน" },
        { status: 400 }
      );
    }

    // 4. อัปโหลดรูปภาพลงระบบ
    // - Local/Docker: เซฟลง Shared Volume → ส่ง path ให้ FastAPI โดยตรง (เร็วมาก)
    // - Hosted: Upload ขึ้น Vercel Blob (Internal Network เร็วมาก) → ได้ URL กลับมาทันที
    const imageResult = await uploadImage(file);

    // 5. ส่งให้ AI วิเคราะห์
    const result = await callFastApiForPrediction(imageResult, activeModel.id);

    // 6. ประเมินความรุนแรงของสิว
    const severity = calculateSeverity(result.counts);

    // 7. บันทึกผลลัพธ์ลงฐานข้อมูล
    const analysisRecord = await prisma.analysis.create({
      data: {
        user: { connect: { id: session.user.id } },
        model: { connect: { id: activeModel.id } },
        image: {
          create: {
            fileName: imageResult.originalImage,
            url: imageResult.imageUrl,
            provider: imageResult.imageProvider,
          },
        },
        detections: result.detections as unknown as Prisma.InputJsonValue,
        counts: result.counts as unknown as Prisma.InputJsonValue,
        total: result.total,
        severity: severity,
      },
    });

    // 8. ส่งผลลัพธ์กลับ
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        id: analysisRecord.id,
        severity,
        imageName: imageResult.originalImage,
        imageUrl: imageResult.imageUrl,
        imageProvider: imageResult.imageProvider,
      },
    });
  } catch (error: any) {
    console.error("API /api/analyze Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ" },
      { status: 500 }
    );
  }
}
