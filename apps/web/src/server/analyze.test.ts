import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateSeverity, confidenceThreshold } from "./analyze";

// เกณฑ์ตามขอบเขตโครงงานข้อ 1.3.3.5
//   เล็กน้อย (MILD)     : สิวไม่อักเสบ ≤ 20 จุด หรือ สิวอักเสบตื้น ≤ 5 จุด
//   ปานกลาง (MODERATE)  : สิวไม่อักเสบ > 20 จุด หรือ สิวอักเสบตื้น 6–20 จุด
//   รุนแรง (SEVERE)      : สิวอักเสบตื้น > 20 จุด หรือ สิวอักเสบลึก ≥ 1 จุด
// กลุ่มสิว: ไม่อักเสบ = blackhead + whitehead, อักเสบตื้น = papule + pustule, อักเสบลึก = nodule + cyst

describe("calculateSeverity", () => {
  describe("ระดับเล็กน้อย (MILD)", () => {
    it("ไม่พบสิวเลย", () => {
      expect(calculateSeverity({})).toBe("MILD");
    });

    it("ทุกชนิดเป็น 0", () => {
      expect(
        calculateSeverity({
          blackhead: 0,
          whitehead: 0,
          papule: 0,
          pustule: 0,
          nodule: 0,
          cyst: 0,
        }),
      ).toBe("MILD");
    });

    it("สิวไม่อักเสบ 20 จุดพอดี (ค่าขอบบน)", () => {
      expect(calculateSeverity({ blackhead: 12, whitehead: 8 })).toBe("MILD");
    });

    it("สิวอักเสบตื้น 5 จุดพอดี (ค่าขอบบน)", () => {
      expect(calculateSeverity({ papule: 3, pustule: 2 })).toBe("MILD");
    });

    it("สิวไม่อักเสบ 20 จุด ร่วมกับสิวอักเสบตื้น 5 จุด", () => {
      expect(calculateSeverity({ blackhead: 20, papule: 5 })).toBe("MILD");
    });
  });

  describe("ระดับปานกลาง (MODERATE)", () => {
    it("สิวไม่อักเสบ 21 จุด (เกินค่าขอบ 1 จุด)", () => {
      expect(calculateSeverity({ blackhead: 11, whitehead: 10 })).toBe(
        "MODERATE",
      );
    });

    it("สิวอักเสบตื้น 6 จุด (ค่าขอบล่าง)", () => {
      expect(calculateSeverity({ papule: 4, pustule: 2 })).toBe("MODERATE");
    });

    it("สิวอักเสบตื้น 20 จุด (ค่าขอบบน)", () => {
      expect(calculateSeverity({ papule: 10, pustule: 10 })).toBe("MODERATE");
    });

    it("สิวไม่อักเสบจำนวนมาก แต่ไม่มีสิวอักเสบ", () => {
      expect(calculateSeverity({ whitehead: 60 })).toBe("MODERATE");
    });
  });

  describe("ระดับรุนแรง (SEVERE)", () => {
    it("สิวอักเสบตื้น 21 จุด (เกินค่าขอบ 1 จุด)", () => {
      expect(calculateSeverity({ papule: 11, pustule: 10 })).toBe("SEVERE");
    });

    it("พบ nodule 1 จุด แม้ไม่มีสิวชนิดอื่น", () => {
      expect(calculateSeverity({ nodule: 1 })).toBe("SEVERE");
    });

    it("พบ cyst 1 จุด แม้ไม่มีสิวชนิดอื่น", () => {
      expect(calculateSeverity({ cyst: 1 })).toBe("SEVERE");
    });

    it("สิวอักเสบลึกมีน้ำหนักเหนือกว่าจำนวนสิวชนิดอื่นที่น้อย", () => {
      expect(calculateSeverity({ blackhead: 2, papule: 1, cyst: 1 })).toBe(
        "SEVERE",
      );
    });
  });

  describe("ข้อมูลที่ไม่ครบหรือไม่รู้จัก", () => {
    it("ชนิดสิวที่ไม่รู้จักไม่ถูกนำมานับ", () => {
      expect(calculateSeverity({ unknown: 99 })).toBe("MILD");
    });

    it("ส่งมาเฉพาะบางชนิด ชนิดที่ขาดนับเป็น 0", () => {
      expect(calculateSeverity({ pustule: 6 })).toBe("MODERATE");
    });
  });
});

describe("confidenceThreshold", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ใช้ค่าจาก env ถ้าอยู่ในช่วง 0–1", () => {
    vi.stubEnv("AI_CONFIDENCE_THRESHOLD", "0.4");
    expect(confidenceThreshold()).toBe(0.4);
  });

  it.each(["", "abc", "0", "1.5"])("ค่า %j ใช้ค่าเริ่มต้น 0.25", (value) => {
    vi.stubEnv("AI_CONFIDENCE_THRESHOLD", value);
    expect(confidenceThreshold()).toBe(0.25);
  });
});
