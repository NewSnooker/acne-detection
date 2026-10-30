import { describe, expect, it } from "vitest";
import {
  IMAGE_ACCEPT,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
  detectImageKind,
  validateImageFile,
} from "./image-file";

// กติกาไฟล์รูปที่รับเข้าวิเคราะห์ (ขอบเขตข้อ 1.3.2.3: อัปโหลดภาพ JPEG และ PNG)

describe("validateImageFile", () => {
  it.each(["image/jpeg", "image/png"])("รับไฟล์ชนิด %s", (type) => {
    expect(validateImageFile({ type, size: 1024 })).toBeNull();
  });

  it.each([
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
    "application/pdf",
    "text/plain",
    "",
  ])("ไม่รับไฟล์ชนิด %s", (type) => {
    expect(validateImageFile({ type, size: 1024 })).toBe(
      "รองรับเฉพาะไฟล์รูปภาพ JPEG และ PNG เท่านั้น",
    );
  });

  it("ไม่รับไฟล์ว่าง (0 byte)", () => {
    expect(validateImageFile({ type: "image/png", size: 0 })).toBe(
      "ไฟล์รูปภาพว่างเปล่า กรุณาเลือกไฟล์ใหม่",
    );
  });

  it("ขนาดสูงสุดคือ 10 MB", () => {
    expect(MAX_IMAGE_SIZE_MB).toBe(10);
    expect(MAX_IMAGE_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });

  it("รับไฟล์ขนาด 10 MB พอดี (ค่าขอบบน)", () => {
    expect(
      validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_SIZE_BYTES }),
    ).toBeNull();
  });

  it("ไม่รับไฟล์ที่เกิน 10 MB แม้ 1 byte", () => {
    expect(
      validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_SIZE_BYTES + 1 }),
    ).toBe("ไฟล์รูปภาพใหญ่เกิน 10 MB กรุณาเลือกไฟล์ที่เล็กลง");
  });

  it("ช่องเลือกไฟล์ของหน้าเว็บจำกัดชนิดไว้ที่ JPEG และ PNG", () => {
    expect(IMAGE_ACCEPT).toBe("image/jpeg,image/png");
  });
});

describe("detectImageKind (ตรวจเนื้อไฟล์จริง)", () => {
  const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46];
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00];
  const WEBP = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00];

  it("รู้จักไฟล์ JPEG", () => {
    expect(detectImageKind(new Uint8Array(JPEG))).toBe("jpeg");
  });

  it("รู้จักไฟล์ PNG", () => {
    expect(detectImageKind(new Uint8Array(PNG))).toBe("png");
  });

  it.each([
    ["GIF", GIF],
    ["WebP", WEBP],
    ["ไฟล์ข้อความ", [0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a, 0x00, 0x00]],
    ["ไฟล์ว่าง", []],
    ["PNG ที่ขาดท้าย (ไม่ครบ 8 byte)", PNG.slice(0, 4)],
  ])("ไม่รับ %s แม้จะเปลี่ยนนามสกุลหรือชนิดไฟล์มา", (_name, bytes) => {
    expect(detectImageKind(new Uint8Array(bytes))).toBeNull();
  });
});
