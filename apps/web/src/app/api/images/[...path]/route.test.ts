import type { NextRequest } from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// GET /api/images/<ชื่อไฟล์> — รูปใบหน้าเป็นข้อมูลส่วนตัว ดูได้เฉพาะเจ้าของรูปและผู้ดูแลระบบ
// ใช้โฟลเดอร์ชั่วคราวจริงแทนโฟลเดอร์เก็บรูป จำลองเฉพาะการเข้าสู่ระบบและฐานข้อมูล
const { auth, analysisFindFirst } = vi.hoisted(() => ({
  auth: vi.fn(),
  analysisFindFirst: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { analysis: { findFirst: analysisFindFirst } },
}));

import { GET } from "./route";

let root: string;
let storageDir: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "acne-img-"));
  storageDir = path.join(root, "images");
  fs.mkdirSync(storageDir);
  fs.writeFileSync(path.join(storageDir, "mine.jpg"), "JPEGDATA");
  fs.writeFileSync(path.join(storageDir, "pic.png"), "PNGDATA");
  fs.writeFileSync(path.join(root, "secret.txt"), "SECRET"); // อยู่นอกโฟลเดอร์เก็บรูป
  vi.stubEnv("STORAGE_PATH", storageDir);
});
afterAll(() => {
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.mockReset();
  analysisFindFirst.mockReset();
});

const get = (...segments: string[]) =>
  GET(new Request("http://localhost/api/images/x") as NextRequest, {
    params: Promise.resolve({ path: segments }),
  });

const asUser = (id = "u1") =>
  auth.mockResolvedValue({ user: { id, role: "USER" } });
const asAdmin = () =>
  auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });

describe("GET /api/images/[...path]", () => {
  it("ยังไม่เข้าสู่ระบบ ตอบ 401", async () => {
    auth.mockResolvedValue(null);

    expect((await get("mine.jpg")).status).toBe(401);
  });

  it("เจ้าของรูปเปิดรูปของตัวเองได้", async () => {
    asUser("u1");
    analysisFindFirst.mockResolvedValue({ id: "analysis1" });

    const res = await get("mine.jpg");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(await res.text()).toBe("JPEGDATA");
    // ค้นด้วยรหัสผู้ใช้ที่เข้าสู่ระบบอยู่ คู่กับชื่อไฟล์ที่ขอ
    expect(analysisFindFirst).toHaveBeenCalledWith({
      where: { userId: "u1", image: { is: { fileName: "mine.jpg" } } },
      select: { id: true },
    });
  });

  it("ผู้ใช้คนอื่นเปิดรูปที่ไม่ใช่ของตัวเอง ได้ 404 และไม่ได้เนื้อไฟล์", async () => {
    asUser("u2");
    analysisFindFirst.mockResolvedValue(null);

    const res = await get("mine.jpg");

    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("JPEGDATA");
  });

  it("ผู้ดูแลระบบเปิดได้ทุกรูป โดยไม่ต้องเป็นเจ้าของ", async () => {
    asAdmin();

    const res = await get("pic.png");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(analysisFindFirst).not.toHaveBeenCalled();
  });

  it("รูปถูกสั่งให้ cache แบบ private (ไม่ให้ตัวกลางเก็บ)", async () => {
    asAdmin();

    const res = await get("mine.jpg");

    expect(res.headers.get("Cache-Control")).toContain("private");
    expect(res.headers.get("Cache-Control")).not.toContain("public");
  });

  it("ใช้ ../ ออกนอกโฟลเดอร์เก็บรูปไม่ได้ แม้เป็นผู้ดูแลระบบ", async () => {
    asAdmin();

    const res = await get("..", "secret.txt");

    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain("SECRET");
  });

  it("ไฟล์ที่ไม่มีอยู่จริง ตอบ 404", async () => {
    asAdmin();

    expect((await get("none.jpg")).status).toBe(404);
  });

  it("ไม่ระบุชื่อไฟล์ ตอบ 404", async () => {
    asAdmin();

    expect((await get()).status).toBe(404);
  });
});
