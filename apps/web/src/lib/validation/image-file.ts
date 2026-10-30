// กติกาไฟล์รูปที่รับเข้าวิเคราะห์ (ขอบเขตโครงงานข้อ 1.3.2.3: JPEG และ PNG)
// ใช้ร่วมกันทั้งฝั่งหน้าเว็บและฝั่ง API เพื่อให้ตรวจด้วยเกณฑ์เดียวกัน

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export type ImageKind = "jpeg" | "png";

/** ตรวจชนิดและขนาดจากข้อมูลของไฟล์ คืนข้อความ error หรือ null ถ้าผ่าน */
export function validateImageFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "รองรับเฉพาะไฟล์รูปภาพ JPEG และ PNG เท่านั้น";
  }
  if (file.size === 0) {
    return "ไฟล์รูปภาพว่างเปล่า กรุณาเลือกไฟล์ใหม่";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `ไฟล์รูปภาพใหญ่เกิน ${MAX_IMAGE_SIZE_MB} MB กรุณาเลือกไฟล์ที่เล็กลง`;
  }
  return null;
}

/** ตรวจเนื้อไฟล์จริงจาก byte ต้นไฟล์ กันการเปลี่ยนนามสกุลหรือปลอมชนิดไฟล์ */
export function detectImageKind(head: Uint8Array): ImageKind | null {
  if (
    head.length >= 3 &&
    head[0] === 0xff &&
    head[1] === 0xd8 &&
    head[2] === 0xff
  ) {
    return "jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (head.length >= 8 && png.every((b, i) => head[i] === b)) {
    return "png";
  }
  return null;
}
