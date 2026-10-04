import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage/image-provider";
import { callFastApiForPrediction, calculateSeverity } from "@/lib/services/analyze-logic";
import { Prisma } from "@prisma/client";
import { detectImageKind, validateImageFile } from "@/lib/validation/image-file";

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
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
    }

    // 2.1 ตรวจชนิดและขนาดไฟล์ (รับเฉพาะ JPEG/PNG ตามขอบเขตข้อ 1.3.2.3)
    const invalid = validateImageFile(file);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    // 2.2 ตรวจเนื้อไฟล์จริง ไม่เชื่อชนิดไฟล์ที่ฝั่งผู้ใช้ส่งมาอย่างเดียว
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const imageKind = detectImageKind(head);
    if (!imageKind) {
      return NextResponse.json(
        { error: "ไฟล์นี้ไม่ใช่รูปภาพ JPEG หรือ PNG ที่ถูกต้อง" },
        { status: 400 }
      );
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
    const imageResult = await uploadImage(file, imageKind);

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
