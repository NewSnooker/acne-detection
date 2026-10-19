import { beforeEach, describe, expect, it, vi } from "vitest";

// จัดการโมเดล AI ของผู้ดูแลระบบ (ขอบเขตข้อ 1.3.1.4) — จำลองฐานข้อมูล
const db = vi.hoisted(() => ({
  aiModel: {
    count: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  analysis: { updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  deleteModelLogic,
  deleteModelsLogic,
  editModelLogic,
  setActiveModelLogic,
  uploadModelLogic,
} from "./model-logic";

const ptFile = (name = "best.pt", bytes = 1024 * 1024) => new File([new Uint8Array(bytes)], name);

beforeEach(() => {
  [...Object.values(db.aiModel), ...Object.values(db.analysis)].forEach((fn) => fn.mockReset());
  db.aiModel.create.mockImplementation(async ({ data }: any) => ({ id: "new", ...data }));
});

describe("uploadModelLogic", () => {
  it("ไม่รับไฟล์ที่ไม่ใช่ .pt", async () => {
    await expect(uploadModelLogic(ptFile("model.onnx"), "n", "v1", "", "a1")).rejects.toThrow(
      "กรุณาอัปโหลดไฟล์นามสกุล .pt เท่านั้น",
    );
    expect(db.aiModel.create).not.toHaveBeenCalled();
  });

  it("ไม่ส่งไฟล์มา ตอบ error เดียวกัน", async () => {
    await expect(uploadModelLogic(undefined as any, "n", "v1", "", "a1")).rejects.toThrow(".pt");
  });

  it("ยังไม่มีโมเดลหลัก โมเดลที่อัปโหลดเป็นโมเดลหลักทันที", async () => {
    db.aiModel.count.mockResolvedValue(0);

    const model = await uploadModelLogic(ptFile(), "YOLO", "v1", "ทดสอบ", "a1");

    expect(model.isActive).toBe(true);
    expect(db.aiModel.count).toHaveBeenCalledWith({ where: { isActive: true } });
  });

  it("มีโมเดลหลักอยู่แล้ว โมเดลใหม่อยู่ในสถานะไม่ได้ใช้", async () => {
    db.aiModel.count.mockResolvedValue(1);

    const model = await uploadModelLogic(ptFile(), "YOLO", "v2", "", "a1");

    expect(model.isActive).toBe(false);
  });

  it("บันทึกชื่อ เวอร์ชัน ขนาด (MB) ผู้อัปโหลด และเนื้อไฟล์ลงฐานข้อมูล", async () => {
    db.aiModel.count.mockResolvedValue(0);

    await uploadModelLogic(ptFile("best.pt", 1.5 * 1024 * 1024), "YOLO", "v1", "รายละเอียด", "a1");

    const { data } = db.aiModel.create.mock.calls[0][0];
    expect(data).toMatchObject({
      name: "YOLO",
      version: "v1",
      description: "รายละเอียด",
      sizeMb: 1.5,
      uploadedBy: "a1",
      provider: "mongodb",
    });
    expect(Buffer.isBuffer(data.modelData)).toBe(true);
    expect(data.modelData.length).toBe(1.5 * 1024 * 1024);
  });

  it("ชื่อไฟล์ที่เก็บถูกทำให้ปลอดภัยและไม่ซ้ำกัน", async () => {
    db.aiModel.count.mockResolvedValue(0);

    await uploadModelLogic(ptFile("../โมเดล ใหม่.pt"), "n", "v", "", "a1");
    await uploadModelLogic(ptFile("../โมเดล ใหม่.pt"), "n", "v", "", "a1");

    const [first, second] = db.aiModel.create.mock.calls.map((c: any) => c[0].data.fileName as string);
    expect(first).toMatch(/^[0-9a-f]{16}_[a-zA-Z0-9._-]+\.pt$/);
    expect(first).not.toContain("/");
    expect(first).not.toBe(second);
  });
});

describe("setActiveModelLogic", () => {
  it("ปิดโมเดลหลักตัวเดิมก่อน แล้วเปิดตัวที่เลือก (มีโมเดลหลักได้ครั้งละ 1 ตัว)", async () => {
    await setActiveModelLogic("m2");

    expect(db.aiModel.updateMany).toHaveBeenCalledWith({ where: { isActive: true }, data: { isActive: false } });
    expect(db.aiModel.update).toHaveBeenCalledWith({ where: { id: "m2" }, data: { isActive: true } });
    expect(db.aiModel.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      db.aiModel.update.mock.invocationCallOrder[0],
    );
  });
});

describe("deleteModelLogic (ลบ 1 ตัว)", () => {
  it("ไม่พบโมเดล ตอบ error และไม่ลบอะไร", async () => {
    db.aiModel.findUnique.mockResolvedValue(null);

    await expect(deleteModelLogic("none")).rejects.toThrow("ไม่พบข้อมูลโมเดล");
    expect(db.aiModel.delete).not.toHaveBeenCalled();
  });

  it("ลบโมเดลแล้วประวัติการวิเคราะห์ยังอยู่ แค่ตัดการอ้างถึงโมเดล", async () => {
    db.aiModel.findUnique.mockResolvedValue({ id: "m1", isActive: false, provider: "mongodb", filePath: "" });

    await deleteModelLogic("m1");

    expect(db.analysis.updateMany).toHaveBeenCalledWith({ where: { modelId: "m1" }, data: { modelId: null } });
    expect(db.aiModel.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });

  // โค้ดปัจจุบันยังลบโมเดลหลักแบบทีละตัวได้ (แบบกลุ่มกันไว้แล้ว) — refactor-plan ข้อ 20
  it.todo("ลบโมเดลหลักที่ใช้งานอยู่ไม่ได้");
});

describe("deleteModelsLogic (ลบหลายตัว)", () => {
  it("ข้ามโมเดลหลักที่ใช้งานอยู่ ลบเฉพาะตัวที่ไม่ได้ใช้", async () => {
    db.aiModel.findUnique.mockImplementation(async ({ where }: any) => ({
      id: where.id,
      isActive: where.id === "active",
      provider: "mongodb",
      filePath: "",
    }));

    await deleteModelsLogic(["active", "old1", "old2"]);

    const deleted = db.aiModel.delete.mock.calls.map((c: any) => c[0].where.id);
    expect(deleted).toEqual(["old1", "old2"]);
  });

  it("ข้ามรหัสโมเดลที่ไม่มีอยู่จริง โดยไม่ error", async () => {
    db.aiModel.findUnique.mockResolvedValue(null);

    await expect(deleteModelsLogic(["x", "y"])).resolves.toBeUndefined();
    expect(db.aiModel.delete).not.toHaveBeenCalled();
  });
});

describe("editModelLogic", () => {
  it("แก้ชื่อ เวอร์ชัน และรายละเอียด โดยไม่แตะสถานะโมเดลหลัก", async () => {
    await editModelLogic("m1", { name: "ใหม่", version: "v2", description: "" });

    expect(db.aiModel.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { name: "ใหม่", version: "v2", description: null },
    });
  });

  it("บันทึกค่าประเมินโมเดล ช่องว่างเป็น null", async () => {
    await editModelLogic("m1", { name: "n", version: "v", mAP50: "85.5", recall: 70, f1Score: "" });

    expect(db.aiModel.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { name: "n", version: "v", description: null, mAP50: 85.5, recall: 70, f1Score: null },
    });
  });

  it.each([-1, 100.1, "abc"])("ไม่รับค่าประเมิน %s", async (value) => {
    await expect(editModelLogic("m1", { name: "n", version: "v", precision: value })).rejects.toThrow(
      "Precision ต้องเป็นตัวเลข 0–100",
    );
    expect(db.aiModel.update).not.toHaveBeenCalled();
  });
});
