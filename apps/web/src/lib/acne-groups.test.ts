import { describe, expect, it } from "vitest";
import { calculateSeverity } from "@/server/analyze";
import { explainSeverity, groupOfType } from "./acne-groups";

describe("explainSeverity", () => {
  it("ระดับตรงกับ calculateSeverity ทุกกรณี", () => {
    const values = [0, 1, 5, 6, 20, 21, 30];
    for (const non of values)
      for (const shallow of values)
        for (const deep of [0, 1, 3]) {
          const counts = { blackhead: non, papule: shallow, cyst: deep };
          expect(explainSeverity(counts).level).toBe(calculateSeverity(counts));
        }
  });

  it("อักเสบลึกเป็นเหตุผลและขึ้นก่อน", () => {
    const r = explainSeverity({ cyst: 1, papule: 4, pustule: 3 });
    expect(r.level).toBe("SEVERE");
    expect(r.reason).toBe("เพราะพบสิวอักเสบลึก 1 จุด (ตั้งแต่ 1 จุด = รุนแรง)");
    expect(r.groups.map((g) => g.id)).toEqual(["deep", "shallow", "non"]);
    expect(r.groups[0].decisive).toBe(true);
    expect(r.groups[1].decisive).toBe(false);
  });

  it("กลุ่มที่พบขึ้นก่อนกลุ่มที่เป็น 0", () => {
    const r = explainSeverity({ papule: 7, blackhead: 2 });
    expect(r.level).toBe("MODERATE");
    expect(r.groups.map((g) => g.id)).toEqual(["shallow", "non", "deep"]);
    expect(r.groups[0].rule).toBe("6–20 จุด = ปานกลาง");
    expect(r.groups[2].rule).toBe("ไม่พบ");
  });

  it("หลายกลุ่มเป็นเหตุผลพร้อมกัน", () => {
    const r = explainSeverity({ blackhead: 25, papule: 8 });
    expect(r.level).toBe("MODERATE");
    expect(r.reason).toContain(" และ");
    expect(r.groups.filter((g) => g.decisive)).toHaveLength(2);
  });

  it("ระดับเล็กน้อยไม่มีกลุ่มที่เป็นเหตุผล", () => {
    const r = explainSeverity({ pustule: 2 });
    expect(r.level).toBe("MILD");
    expect(r.groups.some((g) => g.decisive)).toBe(false);
  });
});

describe("groupOfType", () => {
  it("คืนกลุ่มของแต่ละชนิด", () => {
    expect(groupOfType("cyst")).toBe("deep");
    expect(groupOfType("pustule")).toBe("shallow");
    expect(groupOfType("whitehead")).toBe("non");
    expect(groupOfType("unknown")).toBeNull();
  });
});
