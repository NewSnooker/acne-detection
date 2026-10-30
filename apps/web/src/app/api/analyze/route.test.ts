import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// POST /api/analyze — ขั้นตอนหลักของระบบ: รับรูป → ส่ง AI → ประเมินระดับความรุนแรง → บันทึกผล
// (ขอบเขตข้อ 1.3.2.3, 1.3.2.4, 1.3.3.5) จำลองฐานข้อมูล ที่เก็บรูป และบริการ AI
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
  modelFindFirst: vi.fn(),
  analysisCreate: vi.fn(),
  uploadImage: vi.fn(),
  callFastApiForPrediction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: m.userFindUnique },
    aiModel: { findFirst: m.modelFindFirst },
    analysis: { create: m.analysisCreate },
  },
}));
vi.mock("@/lib/storage/image-provider", () => ({ uploadImage: m.uploadImage }));
// ใช้ calculateSeverity ตัวจริง จำลองเฉพาะการเรียกบริการ AI
vi.mock("@/server/analyze", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/analyze")>()),
  callFastApiForPrediction: m.callFastApiForPrediction,
}));

import { POST } from "./route";

const JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const GIF_BYTES = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x00, 0x00,
]);

function request(file?: File) {
  const body = new FormData();
  if (file) body.append("image", file);
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body,
  }) as NextRequest;
}
const jpeg = () => new File([JPEG_BYTES], "face.jpg", { type: "image/jpeg" });

const aiResult = (counts: Record<string, number>) => ({
  detections: [],
  counts,
  total: Object.values(counts).reduce((a, b) => a + b, 0),
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  Object.values(m).forEach((fn) => fn.mockReset());
  // ค่าเริ่มต้น: ผู้ใช้เข้าสู่ระบบแล้ว มีโมเดลหลัก ทุกอย่างพร้อม
  m.auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  m.userFindUnique.mockResolvedValue({ id: "u1" });
  m.modelFindFirst.mockResolvedValue({ id: "model1" });
  m.uploadImage.mockResolvedValue({
    originalImage: "abc.jpg",
    imageUrl: null,
    imageProvider: "local",
  });
  m.callFastApiForPrediction.mockResolvedValue(aiResult({ papule: 2 }));
  m.analysisCreate.mockResolvedValue({ id: "analysis1" });
});

describe("POST /api/analyze", () => {
  it("ยังไม่เข้าสู่ระบบ ตอบ 401 และไม่บันทึกรูป", async () => {
    m.auth.mockResolvedValue(null);

    const res = await POST(request(jpeg()));

    expect(res.status).toBe(401);
    expect(m.uploadImage).not.toHaveBeenCalled();
  });

  it("session ชี้ไปที่ผู้ใช้ที่ไม่มีในฐานข้อมูลแล้ว ตอบ 401", async () => {
    m.userFindUnique.mockResolvedValue(null);

    const res = await POST(request(jpeg()));

    expect(res.status).toBe(401);
    expect(m.uploadImage).not.toHaveBeenCalled();
  });

  it("ไม่แนบไฟล์ ตอบ 400", async () => {
    const res = await POST(request());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "ไม่พบไฟล์รูปภาพ" });
  });

  it("ไฟล์ชนิดที่ไม่รองรับ (WebP) ตอบ 400 และไม่บันทึกรูป", async () => {
    const res = await POST(
      request(new File([JPEG_BYTES], "face.webp", { type: "image/webp" })),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "รองรับเฉพาะไฟล์รูปภาพ JPEG และ PNG เท่านั้น",
    });
    expect(m.uploadImage).not.toHaveBeenCalled();
  });

  it("ไฟล์ GIF ที่ปลอมชนิดเป็น JPEG ตอบ 400 เพราะเนื้อไฟล์ไม่ตรง", async () => {
    const res = await POST(
      request(new File([GIF_BYTES], "fake.jpg", { type: "image/jpeg" })),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "ไฟล์นี้ไม่ใช่รูปภาพ JPEG หรือ PNG ที่ถูกต้อง",
    });
    expect(m.uploadImage).not.toHaveBeenCalled();
  });

  it("ไม่มีโมเดลหลักที่เปิดใช้งาน ตอบ 400 และไม่บันทึกรูป", async () => {
    m.modelFindFirst.mockResolvedValue(null);

    const res = await POST(request(jpeg()));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("ไม่มีโมเดลที่กำลังเปิดใช้งาน");
    expect(m.uploadImage).not.toHaveBeenCalled();
  });

  it("สำเร็จ: ส่งรูปให้โมเดลหลัก บันทึกผล และตอบระดับความรุนแรง", async () => {
    m.callFastApiForPrediction.mockResolvedValue(
      aiResult({ papule: 4, pustule: 3 }),
    ); // อักเสบตื้น 7 จุด

    const res = await POST(request(jpeg()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      id: "analysis1",
      severity: "MODERATE",
      total: 7,
      imageName: "abc.jpg",
      imageProvider: "local",
    });
    // ใช้โมเดลหลักตัวที่เปิดใช้งานอยู่
    expect(m.modelFindFirst).toHaveBeenCalledWith({
      where: { isActive: true },
    });
    expect(m.callFastApiForPrediction).toHaveBeenCalledWith(
      expect.objectContaining({ originalImage: "abc.jpg" }),
      "model1",
    );
    // บันทึกผลผูกกับผู้ใช้ โมเดล และรูป
    expect(m.analysisCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: "u1" } },
        model: { connect: { id: "model1" } },
        image: {
          create: { fileName: "abc.jpg", url: null, provider: "local" },
        },
        total: 7,
        severity: "MODERATE",
      }),
    });
  });

  it.each([
    ["ไม่พบสิว", {}, "MILD"],
    ["สิวอักเสบตื้น 5 จุด", { papule: 5 }, "MILD"],
    ["สิวไม่อักเสบ 21 จุด", { blackhead: 21 }, "MODERATE"],
    ["พบ cyst 1 จุด", { cyst: 1 }, "SEVERE"],
    ["สิวอักเสบตื้น 21 จุด", { pustule: 21 }, "SEVERE"],
  ])("ผลจาก AI %s บันทึกระดับ %s", async (_name, counts, severity) => {
    m.callFastApiForPrediction.mockResolvedValue(aiResult(counts));

    const res = await POST(request(jpeg()));

    expect((await res.json()).data.severity).toBe(severity);
    expect(m.analysisCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ severity }),
    });
  });

  it("ไฟล์ PNG ถูกบันทึกเป็นชนิด png ตามเนื้อไฟล์จริง", async () => {
    await POST(
      request(new File([PNG_BYTES], "face.png", { type: "image/png" })),
    );

    expect(m.uploadImage).toHaveBeenCalledWith(expect.any(File), "png");
  });

  it("บริการ AI ขัดข้อง ตอบ 500 พร้อมข้อความ และไม่บันทึกผลวิเคราะห์", async () => {
    m.callFastApiForPrediction.mockRejectedValue(
      new Error("การประมวลผลรูปภาพขัดข้องที่ระบบ AI"),
    );

    const res = await POST(request(jpeg()));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "การประมวลผลรูปภาพขัดข้องที่ระบบ AI",
    });
    expect(m.analysisCreate).not.toHaveBeenCalled();
  });
});
