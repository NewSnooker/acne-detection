import { beforeEach, describe, expect, it, vi } from "vitest";

// จัดการผู้ใช้ของผู้ดูแลระบบ (ขอบเขตข้อ 1.3.1.3) — จำลองฐานข้อมูลและที่เก็บรูป
const m = vi.hoisted(() => ({
  analysisFindMany: vi.fn(),
  imageDeleteMany: vi.fn(),
  userDelete: vi.fn(),
  userDeleteMany: vi.fn(),
  deleteImage: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    analysis: { findMany: m.analysisFindMany },
    image: { deleteMany: m.imageDeleteMany },
    user: { delete: m.userDelete, deleteMany: m.userDeleteMany },
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
});

describe("deleteUserLogic (ลบ 1 คน)", () => {
  it("ผู้ดูแลระบบลบบัญชีของตัวเองไม่ได้", async () => {
    await expect(deleteUserLogic("a1", "a1")).rejects.toThrow(
      "คุณไม่สามารถลบบัญชีผู้ดูแลระบบของตัวเองได้",
    );
    expect(m.userDelete).not.toHaveBeenCalled();
  });

  it("ลบผู้ใช้ที่ไม่มีประวัติ", async () => {
    await deleteUserLogic("u1", "a1");

    expect(m.userDelete).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(m.imageDeleteMany).not.toHaveBeenCalled();
  });

  it("ลบผู้ใช้แล้วไฟล์รูปและข้อมูลรูปของผู้ใช้นั้นถูกลบตาม", async () => {
    m.analysisFindMany.mockResolvedValue([analysis(1), analysis(2)]);

    await deleteUserLogic("u1", "a1");

    expect(m.analysisFindMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      include: { image: true },
    });
    expect(m.deleteImage).toHaveBeenCalledTimes(2);
    expect(m.deleteImage).toHaveBeenCalledWith("f1.jpg", "local", null);
    expect(m.imageDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["img1", "img2"] } },
    });
    expect(m.userDelete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("ลบไฟล์รูปไม่สำเร็จ ก็ยังลบบัญชีผู้ใช้ต่อได้", async () => {
    m.analysisFindMany.mockResolvedValue([analysis(1)]);
    m.deleteImage.mockRejectedValue(new Error("disk error"));

    await deleteUserLogic("u1", "a1");

    expect(m.userDelete).toHaveBeenCalled();
  });
});

describe("deleteUsersLogic (ลบหลายคน)", () => {
  it("ตัดบัญชีของตัวเองออกจากรายการ แล้วลบคนที่เหลือ", async () => {
    const count = await deleteUsersLogic(["u1", "a1", "u2"], "a1");

    expect(count).toBe(2);
    expect(m.userDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["u1", "u2"] } },
    });
  });

  it("เลือกมาแต่บัญชีของตัวเอง ตอบ error และไม่ลบใคร", async () => {
    await expect(deleteUsersLogic(["a1"], "a1")).rejects.toThrow(
      "ไม่มีผู้ใช้ที่สามารถลบได้",
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
      include: { image: true },
    });
    expect(m.deleteImage).toHaveBeenCalledTimes(3);
    expect(m.imageDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["img1", "img2", "img3"] } },
    });
  });
});
