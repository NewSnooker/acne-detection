import { NextRequest, NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { deleteImage, uploadImage } from "@/lib/storage/image-provider";
import { callFastApiForPrediction, calculateSeverity } from "@/server/analyze";
import { Prisma } from "@prisma/client";
import {
  SLOW_REQUEST_MS,
  createStepTimer,
  requestIdFrom,
} from "@/lib/request-log";
import {
  detectImageKind,
  validateImageFile,
} from "@/lib/validation/image-file";

export async function POST(req: NextRequest) {
  // log "analyze timing [<id>]: ..." ทีละขั้น — ดูวิธีอ่านที่ dev-docs/performance/web.md
  const requestId = requestIdFrom(req.headers);
  const timer = createStepTimer();
  try {
    // 1. เช็คสิทธิ์การเข้าใช้งาน และตรวจสอบว่ามี User อยู่จริงใน DB
    timer.step("auth");
    const guard = await requireUserApi();
    if (!guard.ok) return guard.response;
    const { session } = guard;

    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        {
          error:
            "ไม่พบบัญชีผู้ใช้งานในระบบ (Session ไม่ถูกต้องหรือฐานข้อมูลถูกรีเซ็ต) กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่",
        },
        { status: 401 },
      );
    }

    // 2. รับไฟล์รูปภาพจาก Request
    timer.step("read form");
    const formData = await req.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
    }

    // 2.1 ตรวจชนิดและขนาดไฟล์ (รับเฉพาะ JPEG/PNG ตามขอบเขตข้อ 1.3.2.3)
    timer.step("check file");
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
        { status: 400 },
      );
    }

    // 3. หาโมเดลที่ทำงานอยู่ (Active Model)
    // ใช้แค่ id — ห้ามดึง modelData (ไฟล์ .pt หลาย MB) มาทุกครั้งที่วิเคราะห์
    timer.step("find model");
    const activeModel = await prisma.aiModel.findFirst({
      where: { isActive: true },
      select: { id: true, useTta: true, confidence: true },
    });

    if (!activeModel) {
      return NextResponse.json(
        { error: "ไม่มีโมเดลที่กำลังเปิดใช้งานอยู่ในระบบ กรุณาติดต่อแอดมิน" },
        { status: 400 },
      );
    }

    // 4. อัปโหลดรูปภาพลงระบบ
    // - Local/Docker: เซฟลง Shared Volume → ส่ง path ให้ FastAPI โดยตรง (เร็วมาก)
    // - Hosted: Upload ขึ้น Vercel Blob / Azure Blob → ได้ชื่อไฟล์หรือ URL กลับมา
    // (ที่เก็บดูได้จาก "web start: ... image=" — ขั้นนี้รวมการสร้างลิงก์ SAS ให้ ai ด้วย)
    timer.step("upload");
    const imageResult = await uploadImage(file, imageKind);

    let result: Awaited<ReturnType<typeof callFastApiForPrediction>>;
    let severity: ReturnType<typeof calculateSeverity>;
    let analysisRecord: { id: string };
    try {
      // 5. ส่งให้ AI วิเคราะห์ (เริ่มขั้น "ai request" ตอนยิง fetch)
      result = await callFastApiForPrediction(imageResult, activeModel, {
        timer,
        requestId,
      });

      // 6. ประเมินความรุนแรงของสิว + 7. บันทึกผลลัพธ์ลงฐานข้อมูล
      timer.step("save db");
      severity = calculateSeverity(result.counts);
      analysisRecord = await prisma.analysis.create({
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
          usedTta: activeModel.useTta,
          confidence: activeModel.confidence,
        },
      });
      timer.done();
    } catch (error) {
      // วิเคราะห์หรือบันทึกไม่สำเร็จ — ลบรูปที่อัปโหลดไปแล้ว ไม่ให้ค้างบนดิสก์/Blob
      await deleteImage(
        imageResult.originalImage,
        imageResult.imageProvider,
        imageResult.imageUrl,
      ).catch((cleanupError) =>
        console.error("Failed to clean up uploaded image:", cleanupError),
      );
      throw error;
    }

    const line = `analyze timing [${requestId}]: ${timer.summary()} | ${result.total} detections | tta=${activeModel.useTta}`;
    if (timer.totalMs() > SLOW_REQUEST_MS) console.warn(`${line} | slow`);
    else console.info(line);

    // 8. ส่งผลลัพธ์กลับ — Server-Timing ให้ดูเวลาแต่ละขั้นใน DevTools → Network → Timing
    return NextResponse.json(
      {
        success: true,
        data: {
          ...result,
          id: analysisRecord.id,
          severity,
          usedTta: activeModel.useTta,
          imageName: imageResult.originalImage,
          imageUrl: imageResult.imageUrl,
          imageProvider: imageResult.imageProvider,
        },
      },
      {
        headers: {
          "Server-Timing": timer.serverTiming(),
          "X-Request-ID": requestId,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error(
      `analyze failed [${requestId}]: step=${timer.current() ?? "-"} error=${message || "unknown"} | ${timer.summary()}`,
      error,
    );
    return NextResponse.json(
      { error: message || "เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ" },
      { status: 500, headers: { "X-Request-ID": requestId } },
    );
  }
}
