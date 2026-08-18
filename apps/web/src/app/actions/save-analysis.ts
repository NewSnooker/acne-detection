"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
interface Detection {
  type: string;
  confidence: number;
  bbox: BBox;
}
interface SaveAnalysisInput {
  detections: Detection[];
  counts: Record<string, number>;
  total: number;
  modelId: string;
  imageName: string;
  imageUrl: string | null;
  imageProvider: string;
}

function calculateSeverity(
  counts: Record<string, number>,
): "MILD" | "MODERATE" | "SEVERE" {
  const nonInflammatory = (counts["blackhead"] || 0) + (counts["whitehead"] || 0);
  const shallowInflammatory = (counts["papule"] || 0) + (counts["pustule"] || 0);
  const deepInflammatory = (counts["nodule"] || 0) + (counts["cyst"] || 0);

  if (shallowInflammatory > 20 || deepInflammatory >= 1) return "SEVERE";
  if (nonInflammatory > 20 || (shallowInflammatory >= 6 && shallowInflammatory <= 20)) return "MODERATE";
  return "MILD";
}

export async function saveAnalysisResult(input: SaveAnalysisInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const severity = calculateSeverity(input.counts);

    const analysisRecord = await prisma.analysis.create({
      data: {
        user: { connect: { id: session.user.id } },
        model: { connect: { id: input.modelId } },
        image: {
          create: {
            fileName: input.imageName,
            url: input.imageUrl,
            provider: input.imageProvider,
          },
        },
        detections: input.detections as unknown as Prisma.InputJsonValue,
        counts: input.counts as unknown as Prisma.InputJsonValue,
        total: input.total,
        severity: severity,
      },
    });

    return {
      success: true,
      data: {
        id: analysisRecord.id,
        severity,
        total: input.total,
        counts: input.counts,
        detections: input.detections,
      },
    };
  } catch (error) {
    console.error("Error saving analysis result:", error);
    return {
      error: "บันทึกผลลัพธ์ลงฐานข้อมูลไม่สำเร็จ แต่การประมวลผลเสร็จสิ้นแล้ว",
    };
  }
}
