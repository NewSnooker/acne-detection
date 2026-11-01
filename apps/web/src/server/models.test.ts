import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// จัดการโมเดล AI ของผู้ดูแลระบบ (ขอบเขตข้อ 1.3.1.4) — จำลองฐานข้อมูล
const db = vi.hoisted(() => ({
  aiModel: {
    count: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  analysis: { updateMany: vi.fn() },
  aiModelChunk: { deleteMany: vi.fn() },
  // จำลอง transaction: แบบ array รอผลคำสั่งที่เรียกไปแล้ว, แบบ callback ส่ง db ตัวเดิมเป็น tx
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  deleteModelLogic,
  deleteModelsLogic,
  editModelLogic,
  setActiveModelLogic,
} from "./models";

beforeEach(() => {
  [
    ...Object.values(db.aiModel),
    ...Object.values(db.analysis),
    ...Object.values(db.aiModelChunk),
  ].forEach((fn) => fn.mockReset());
  db.$transaction.mockReset();
  db.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function" ? arg(db) : Promise.all(arg as unknown[]),
  );
  db.aiModel.count.mockResolvedValue(1);
  db.aiModel.deleteMany.mockImplementation(
    async ({ where }: { where: { id: { in: string[] } } }) => ({
      count: where.id.in.length,
    }),
  );
  db.aiModel.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "new",
      ...data,
    }),
  );
});

describe("setActiveModelLogic", () => {
  it("ปิดโมเดลหลักตัวเดิมก่อน แล้วเปิดตัวที่เลือก (มีโมเดลหลักได้ครั้งละ 1 ตัว)", async () => {
    db.aiModel.findUnique.mockResolvedValue({ uploadComplete: null });

    await setActiveModelLogic("m2");

    expect(db.aiModel.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    });
    expect(db.aiModel.update).toHaveBeenCalledWith({
      where: { id: "m2" },
      data: { isActive: true },
    });
    expect(db.aiModel.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      db.aiModel.update.mock.invocationCallOrder[0],
    );
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("ไม่พบโมเดล ตอบ 404 และไม่ปิดโมเดลหลักตัวเดิม", async () => {
    db.aiModel.findUnique.mockResolvedValue(null);

    await expect(setActiveModelLogic("none")).rejects.toMatchObject({
      status: 404,
    });
    expect(db.aiModel.updateMany).not.toHaveBeenCalled();
  });
});

describe("setActiveModelLogic: อัปโหลดไม่ครบ", () => {
  it("โมเดลที่ยังอัปโหลดชิ้นไม่ครบ ตั้งเป็นโมเดลหลักไม่ได้ (409)", async () => {
    db.aiModel.findUnique.mockResolvedValue({ uploadComplete: false });

    await expect(setActiveModelLogic("m3")).rejects.toMatchObject({
      status: 409,
    });
    expect(db.aiModel.updateMany).not.toHaveBeenCalled();
  });
});

describe("deleteModelLogic (ลบ 1 ตัว)", () => {
  it("ไม่พบโมเดล ตอบ 404 และไม่ลบอะไร", async () => {
    db.aiModel.findMany.mockResolvedValue([]);
    db.aiModel.count.mockResolvedValue(0);

    await expect(deleteModelLogic("none")).rejects.toMatchObject({
      status: 404,
    });
    expect(db.aiModel.deleteMany).not.toHaveBeenCalled();
  });

  it("ลบโมเดลแล้วประวัติการวิเคราะห์ยังอยู่ แค่ตัดการอ้างถึงโมเดล", async () => {
    db.aiModel.findMany.mockResolvedValue([
      { id: "m1", provider: "mongodb", filePath: "" },
    ]);

    await deleteModelLogic("m1");

    expect(db.analysis.updateMany).toHaveBeenCalledWith({
      where: { modelId: { in: ["m1"] } },
      data: { modelId: null },
    });
    expect(db.aiModel.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["m1"] }, isActive: false },
    });
    // ชิ้นไฟล์ของโมเดลแบบหั่นชิ้นถูกลบใน transaction เดียวกัน
    expect(db.aiModelChunk.deleteMany).toHaveBeenCalledWith({
      where: { modelId: { in: ["m1"] } },
    });
  });

  it("ลบโมเดลหลักที่ใช้งานอยู่ไม่ได้ (409)", async () => {
    db.aiModel.findMany.mockResolvedValue([]); // ไม่ผ่านเงื่อนไข isActive: false
    db.aiModel.count.mockResolvedValue(1);

    await expect(deleteModelLogic("m1")).rejects.toMatchObject({ status: 409 });
    expect(db.aiModel.deleteMany).not.toHaveBeenCalled();
  });

  it("มีคนตั้งเป็นโมเดลหลักระหว่างลบ → 409 และ transaction ย้อนกลับ", async () => {
    db.aiModel.findMany.mockResolvedValue([
      { id: "m1", provider: "mongodb", filePath: "" },
    ]);
    db.aiModel.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteModelLogic("m1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("deleteModelsLogic (ลบหลายตัว)", () => {
  it("ลบเฉพาะตัวที่ไม่ใช่โมเดลหลักใน transaction เดียว คืนจำนวนที่ลบ", async () => {
    db.aiModel.findMany.mockResolvedValue([
      { id: "old1", provider: "mongodb", filePath: "" },
      { id: "old2", provider: "mongodb", filePath: "" },
    ]);

    await expect(deleteModelsLogic(["active", "old1", "old2"])).resolves.toBe(
      2,
    );

    expect(db.aiModel.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["active", "old1", "old2"] },
      isActive: false,
    });
    expect(db.aiModel.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["old1", "old2"] }, isActive: false },
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("ไม่มีตัวที่ลบได้ คืน 0 โดยไม่ error", async () => {
    db.aiModel.findMany.mockResolvedValue([]);

    await expect(deleteModelsLogic(["x", "y"])).resolves.toBe(0);
    expect(db.aiModel.deleteMany).not.toHaveBeenCalled();
  });
});

describe("editModelLogic", () => {
  it("แก้ชื่อ เวอร์ชัน และรายละเอียด โดยไม่แตะสถานะโมเดลหลัก", async () => {
    await editModelLogic("m1", {
      name: "ใหม่",
      version: "v2",
      description: "",
    });

    expect(db.aiModel.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { name: "ใหม่", version: "v2", description: null },
    });
  });

  it("บันทึกค่าประเมินโมเดล ช่องว่างเป็น null", async () => {
    await editModelLogic("m1", {
      name: "n",
      version: "v",
      mAP50: "85.5",
      recall: 70,
      f1Score: "",
    });

    expect(db.aiModel.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: {
        name: "n",
        version: "v",
        description: null,
        mAP50: 85.5,
        recall: 70,
        f1Score: null,
      },
    });
  });

  it("ไม่พบโมเดล ตอบ 404", async () => {
    db.aiModel.count.mockResolvedValue(0);

    await expect(
      editModelLogic("none", { name: "n", version: "v" }),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.aiModel.update).not.toHaveBeenCalled();
  });

  it.each([-1, 100.1, "abc"])("ไม่รับค่าประเมิน %s", async (value) => {
    await expect(
      editModelLogic("m1", { name: "n", version: "v", precision: value }),
    ).rejects.toThrow("Precision ต้องเป็นตัวเลข 0–100");
    expect(db.aiModel.update).not.toHaveBeenCalled();
  });
});
