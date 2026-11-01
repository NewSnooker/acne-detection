import { beforeEach, describe, expect, it, vi } from "vitest";

// จัดการผู้ใช้ของผู้ดูแลระบบ (ขอบเขตข้อ 1.3.1.3) — จำลองฐานข้อมูลและที่เก็บรูป
const m = vi.hoisted(() => ({
  analysisFindMany: vi.fn(),
  imageDeleteMany: vi.fn(),
  userDeleteMany: vi.fn(),
  userFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  deleteImage: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    analysis: { findMany: m.analysisFindMany },
    image: { deleteMany: m.imageDeleteMany },
    user: {
      deleteMany: m.userDeleteMany,
      findUnique: m.userFindUnique,
      findMany: m.userFindMany,
    },
  },
}));
vi.mock("@/lib/storage/image-provider", () => ({ deleteImage: m.deleteImage }));

import { deleteUserLogic, deleteUsersLogic } from "./users";

const analysis = (n: number) => ({
  id: `an${n}`,
  image: { id: `img${n}`, fileName: `f${n}.jpg`, provider: "local", url: null },
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  Object.values(m).forEach((fn) => fn.mockReset());
  m.analysisFindMany.mockResolvedValue([]);
  // ค่าเริ่มต้น: ทุก id เป็นผู้ใช้ทั่วไปที่มีอยู่จริง
  m.userFindUnique.mockResolvedValue({ role: "USER" });
  m.userFindMany.mockImplementation(
    async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => ({ id })),
  );
  m.userDeleteMany.mockImplementation(
    async ({ where }: { where: { id: { in: string[] } } }) => ({
      count: where.id.in.length,
    }),
  );
});

describe("deleteUserLogic (ลบ 1 คน)", () => {
  it("ผู้ดูแลระบบลบบัญชีของตัวเองไม่ได้", async () => {
    await expect(deleteUserLogic("a1", "a1")).rejects.toThrow(
      "คุณไม่สามารถลบบัญชีผู้ดูแลระบบของตัวเองได้",
    );
    expect(m.userDeleteMany).not.toHaveBeenCalled();
  });

  it("ลบผู้ใช้ที่ไม่มีประวัติ", async () => {
    await deleteUserLogic("u1", "a1");

    expect(m.userDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["u1"] }, role: "USER" },
    });
    expect(m.imageDeleteMany).not.toHaveBeenCalled();
  });

  it("ลบผู้ใช้แล้วไฟล์รูปและข้อมูลรูปของผู้ใช้นั้นถูกลบตาม", async () => {
    m.analysisFindMany.mockResolvedValue([analysis(1), analysis(2)]);

    await deleteUserLogic("u1", "a1");

    expect(m.analysisFindMany).toHaveBeenCalledWith({
      where: { userId: { in: ["u1"] } },
      select: { image: true },
    });
    expect(m.deleteImage).toHaveBeenCalledTimes(2);
    expect(m.deleteImage).toHaveBeenCalledWith("f1.jpg", "local", null);
    expect(m.imageDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["img1", "img2"] } },
    });
    expect(m.userDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["u1"] }, role: "USER" },
    });
  });

  it("ลบไฟล์รูปไม่สำเร็จ ก็ยังลบบัญชีผู้ใช้ต่อได้", async () => {
    m.analysisFindMany.mockResolvedValue([analysis(1)]);
    m.deleteImage.mockRejectedValue(new Error("disk error"));

    await deleteUserLogic("u1", "a1");

    expect(m.userDeleteMany).toHaveBeenCalled();
  });
});

describe("deleteUsersLogic (ลบหลายคน)", () => {
  it("ตัดบัญชีของตัวเองออกจากรายการ แล้วลบคนที่เหลือ", async () => {
    const count = await deleteUsersLogic(["u1", "a1", "u2"], "a1");

    expect(count).toBe(2);
    expect(m.userDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["u1", "u2"] }, role: "USER" },
    });
  });

  it("เลือกมาแต่บัญชีของตัวเอง ตอบ error และไม่ลบใคร", async () => {
    await expect(deleteUsersLogic(["a1"], "a1")).rejects.toThrow(
      "ไม่มีผู้ใช้ที่ลบได้",
    );
    expect(m.userDeleteMany).not.toHaveBeenCalled();
  });

  it("ลบรูปของผู้ใช้ทุกคนที่ถูกลบ", async () => {
    m.analysisFindMany.mockResolvedValue([
      analysis(1),
      analysis(2),
      analysis(3),
    ]);

    await deleteUsersLogic(["u1", "u2"], "a1");

    expect(m.analysisFindMany).toHaveBeenCalledWith({
      where: { userId: { in: ["u1", "u2"] } },
      select: { image: true },
    });
    expect(m.deleteImage).toHaveBeenCalledTimes(3);
    expect(m.imageDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["img1", "img2", "img3"] } },
    });
  });
});

describe("กันลบบัญชีผู้ดูแลระบบที่ server", () => {
  it("ลบแอดมินคนอื่นทีละคนไม่ได้ (403)", async () => {
    m.userFindUnique.mockResolvedValue({ role: "ADMIN" });

    await expect(deleteUserLogic("a2", "a1")).rejects.toMatchObject({
      status: 403,
    });
    expect(m.userDeleteMany).not.toHaveBeenCalled();
  });

  it("ลบผู้ใช้ที่ไม่มีอยู่ ตอบ 404", async () => {
    m.userFindUnique.mockResolvedValue(null);

    await expect(deleteUserLogic("x", "a1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("ลบกลุ่ม: ค้นเฉพาะ role USER และไม่ใช่ตัวเอง แล้วลบด้วยเงื่อนไขเดียวกัน", async () => {
    m.userFindMany.mockResolvedValue([{ id: "u1" }]); // a2 เป็นแอดมิน จึงไม่ถูกคืนมา

    const count = await deleteUsersLogic(["u1", "a2", "a1"], "a1");

    expect(m.userFindMany.mock.calls[0][0].where).toEqual({
      id: { in: ["u1", "a2"] },
      role: "USER",
    });
    expect(m.userDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["u1"] }, role: "USER" },
    });
    expect(count).toBe(1);
  });

  it("เลือกมาแต่แอดมิน ตอบ 400 และไม่ลบใคร", async () => {
    m.userFindMany.mockResolvedValue([]);

    await expect(deleteUsersLogic(["a2"], "a1")).rejects.toMatchObject({
      status: 400,
    });
    expect(m.analysisFindMany).not.toHaveBeenCalled();
  });
});
