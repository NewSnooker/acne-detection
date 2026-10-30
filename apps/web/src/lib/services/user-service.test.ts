import { beforeEach, describe, expect, it, vi } from "vitest";

// หน้า /admin/users ส่งผลลัพธ์นี้ไปที่เบราว์เซอร์ จึงต้องไม่มี hash รหัสผ่าน
const m = vi.hoisted(() => ({ userFindMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: m.userFindMany } },
}));

import { getAllUsers } from "./user-service";

beforeEach(() => {
  m.userFindMany.mockReset();
  m.userFindMany.mockResolvedValue([]);
});

describe("getAllUsers", () => {
  it("เลือกฟิลด์แบบระบุชื่อ และไม่ดึง password", async () => {
    await getAllUsers();
    const args = m.userFindMany.mock.calls[0][0];
    expect(args.select).toBeDefined();
    expect(args.include).toBeUndefined();
    expect(args.select.password).toBeUndefined();
  });
});
