import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// /api/models/<id> — ไฟล์โมเดลโหลดได้เฉพาะบริการ AI (ส่ง X-API-Key) หรือผู้ดูแลระบบ
// และการตั้งโมเดลหลัก/ลบโมเดลทำได้เฉพาะผู้ดูแลระบบ (ขอบเขตข้อ 1.3.1.4)
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  modelFindUnique: vi.fn(),
  deleteModelLogic: vi.fn(),
  setActiveModelLogic: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { aiModel: { findUnique: m.modelFindUnique } } }));
vi.mock("@/lib/services/model-logic", () => ({
  deleteModelLogic: m.deleteModelLogic,
  setActiveModelLogic: m.setActiveModelLogic,
}));

import { DELETE, GET, PUT } from "./route";

const KEY = "test-ai-key";
const ctx = { params: Promise.resolve({ id: "model1" }) };
const req = (headers: Record<string, string> = {}, method = "GET") =>
  new Request("http://localhost/api/models/model1", { method, headers });

const USER = { user: { id: "u1", role: "USER" } };
const ADMIN = { user: { id: "a1", role: "ADMIN" } };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  Object.values(m).forEach((fn) => fn.mockReset());
  vi.stubEnv("AI_SERVICE_API_KEY", KEY);
  m.auth.mockResolvedValue(null);
  m.modelFindUnique.mockResolvedValue({
    modelData: Buffer.from("MODELBYTES"),
    fileName: "best.pt",
    provider: "mongodb",
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET (ดาวน์โหลดไฟล์โมเดล)", () => {
  it("บริการ AI ส่ง key ถูกต้อง ได้ไฟล์โมเดล", async () => {
    const res = await GET(req({ "x-api-key": KEY }), ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(await res.text()).toBe("MODELBYTES");
  });

  it("key ผิด และไม่ได้เข้าสู่ระบบ ตอบ 401 และไม่อ่านฐานข้อมูล", async () => {
    const res = await GET(req({ "x-api-key": "wrong" }), ctx);

    expect(res.status).toBe(401);
    expect(m.modelFindUnique).not.toHaveBeenCalled();
  });

  it("ไม่ส่ง key และไม่ได้เข้าสู่ระบบ ตอบ 401", async () => {
    expect((await GET(req(), ctx)).status).toBe(401);
  });

  it("ผู้ใช้ทั่วไปที่เข้าสู่ระบบแล้ว โหลดไฟล์โมเดลไม่ได้ (403)", async () => {
    m.auth.mockResolvedValue(USER);

    const res = await GET(req(), ctx);

    expect(res.status).toBe(403);
    expect(m.modelFindUnique).not.toHaveBeenCalled();
  });

  it("ผู้ดูแลระบบโหลดได้โดยไม่ต้องมี key", async () => {
    m.auth.mockResolvedValue(ADMIN);

    expect((await GET(req(), ctx)).status).toBe(200);
  });

  it("ถ้าระบบไม่ได้ตั้งค่า key ไว้ การส่ง key ว่างไม่ถือว่าผ่าน", async () => {
    vi.stubEnv("AI_SERVICE_API_KEY", "");

    expect((await GET(req({ "x-api-key": "" }), ctx)).status).toBe(401);
  });

  it("ไม่พบโมเดล ตอบ 404", async () => {
    m.modelFindUnique.mockResolvedValue(null);

    expect((await GET(req({ "x-api-key": KEY }), ctx)).status).toBe(404);
  });
});

describe("PUT (ตั้งเป็นโมเดลหลัก) และ DELETE (ลบโมเดล)", () => {
  it("ผู้ใช้ทั่วไปตั้งโมเดลหลักไม่ได้ (403)", async () => {
    m.auth.mockResolvedValue(USER);

    expect((await PUT(req({}, "PUT"), ctx)).status).toBe(403);
    expect(m.setActiveModelLogic).not.toHaveBeenCalled();
  });

  it("ผู้ใช้ทั่วไปลบโมเดลไม่ได้ (403)", async () => {
    m.auth.mockResolvedValue(USER);

    expect((await DELETE(req({}, "DELETE"), ctx)).status).toBe(403);
    expect(m.deleteModelLogic).not.toHaveBeenCalled();
  });

  it("key ของบริการ AI ใช้ตั้งโมเดลหลักหรือลบโมเดลไม่ได้", async () => {
    expect((await PUT(req({ "x-api-key": KEY }, "PUT"), ctx)).status).toBe(401);
    expect((await DELETE(req({ "x-api-key": KEY }, "DELETE"), ctx)).status).toBe(401);
  });

  it("ผู้ดูแลระบบตั้งโมเดลหลักได้", async () => {
    m.auth.mockResolvedValue(ADMIN);

    const res = await PUT(req({}, "PUT"), ctx);

    expect(res.status).toBe(200);
    expect(m.setActiveModelLogic).toHaveBeenCalledWith("model1");
  });

  it("ผู้ดูแลระบบลบโมเดลได้", async () => {
    m.auth.mockResolvedValue(ADMIN);

    const res = await DELETE(req({}, "DELETE"), ctx);

    expect(res.status).toBe(200);
    expect(m.deleteModelLogic).toHaveBeenCalledWith("model1");
  });
});
