import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// /api/models/<id> — ไฟล์โมเดลโหลดได้เฉพาะบริการ AI (ส่ง X-API-Key) หรือผู้ดูแลระบบ
// และการตั้งโมเดลหลัก/ลบโมเดลทำได้เฉพาะผู้ดูแลระบบ (ขอบเขตข้อ 1.3.1.4)
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  modelFindUnique: vi.fn(),
  deleteModelLogic: vi.fn(),
  setActiveModelLogic: vi.fn(),
  editModelLogic: vi.fn(),
  setModelTtaLogic: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { aiModel: { findUnique: m.modelFindUnique } },
}));
vi.mock("@/server/models", () => ({
  deleteModelLogic: m.deleteModelLogic,
  setActiveModelLogic: m.setActiveModelLogic,
  editModelLogic: m.editModelLogic,
  setModelTtaLogic: m.setModelTtaLogic,
}));

import { HttpError } from "@/lib/http-error";
import { POST as ACTIVATE } from "./activate/route";
import { PUT as SET_TTA } from "./tta/route";
import { DELETE, GET, PATCH } from "./route";

const KEY = "test-ai-key";
const ctx = { params: Promise.resolve({ id: "model1" }) };
const req = (
  headers: Record<string, string> = {},
  method = "GET",
  body?: unknown,
) =>
  new Request("http://localhost/api/models/model1", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

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

  it("โมเดลที่เก็บเป็นไฟล์ ส่งเนื้อไฟล์จาก MODEL_STORAGE_PATH", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "models-"));
    try {
      await writeFile(path.join(dir, "abc_best.pt"), "FILEBYTES");
      vi.stubEnv("MODEL_STORAGE_PATH", dir);
      m.modelFindUnique.mockResolvedValue({
        fileName: "abc_best.pt",
        provider: "file",
        filePath: "abc_best.pt",
      });

      const res = await GET(req({ "x-api-key": KEY }), ctx);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Length")).toBe("9");
      expect(await res.text()).toBe("FILEBYTES");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("โมเดลแบบไฟล์ที่เซิร์ฟเวอร์นี้ไม่มีไฟล์ ตอบ 409 พร้อมบอกให้อัปโหลดใหม่", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "models-"));
    vi.stubEnv("MODEL_STORAGE_PATH", dir);
    m.modelFindUnique.mockResolvedValue({
      fileName: "gone.pt",
      provider: "file",
      filePath: "gone.pt",
    });

    const res = await GET(req({ "x-api-key": KEY }), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("อัปโหลดไฟล์ใหม่");
    await rm(dir, { recursive: true, force: true });
  });

  it("โมเดลแบบไฟล์บนเครื่องที่ไม่ได้ตั้ง MODEL_STORAGE_PATH (เช่น Vercel) ตอบ 409 ไม่ใช่ 500", async () => {
    vi.stubEnv("MODEL_STORAGE_PATH", "");
    m.modelFindUnique.mockResolvedValue({
      fileName: "x.pt",
      provider: "file",
      filePath: "x.pt",
    });

    expect((await GET(req({ "x-api-key": KEY }), ctx)).status).toBe(409);
  });
});

describe("POST /activate (ตั้งเป็นโมเดลหลัก) และ DELETE (ลบโมเดล)", () => {
  it("ผู้ใช้ทั่วไปตั้งโมเดลหลักไม่ได้ (403)", async () => {
    m.auth.mockResolvedValue(USER);

    expect((await ACTIVATE(req({}, "POST"), ctx)).status).toBe(403);
    expect(m.setActiveModelLogic).not.toHaveBeenCalled();
  });

  it("ผู้ใช้ทั่วไปลบโมเดลไม่ได้ (403)", async () => {
    m.auth.mockResolvedValue(USER);

    expect((await DELETE(req({}, "DELETE"), ctx)).status).toBe(403);
    expect(m.deleteModelLogic).not.toHaveBeenCalled();
  });

  it("key ของบริการ AI ใช้ตั้งโมเดลหลักหรือลบโมเดลไม่ได้", async () => {
    expect(
      (await ACTIVATE(req({ "x-api-key": KEY }, "POST"), ctx)).status,
    ).toBe(401);
    expect(
      (await DELETE(req({ "x-api-key": KEY }, "DELETE"), ctx)).status,
    ).toBe(401);
  });

  it("ผู้ดูแลระบบตั้งโมเดลหลักได้", async () => {
    m.auth.mockResolvedValue(ADMIN);

    const res = await ACTIVATE(req({}, "POST"), ctx);

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

describe("DELETE / activate — error ที่ตั้งใจให้ผู้ใช้เห็น", () => {
  it("ลบโมเดลหลักไม่ได้ ตอบ 409 พร้อมข้อความภาษาไทย", async () => {
    m.auth.mockResolvedValue(ADMIN);
    m.deleteModelLogic.mockRejectedValue(
      new HttpError(409, "ลบโมเดลหลักไม่ได้"),
    );

    const res = await DELETE(req({}, "DELETE"), ctx);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "ลบโมเดลหลักไม่ได้" });
  });

  it("error ที่ไม่คาดคิด ตอบ 500 และไม่เปิดเผยข้อความภายใน", async () => {
    m.auth.mockResolvedValue(ADMIN);
    m.setActiveModelLogic.mockRejectedValue(new Error("mongo secret detail"));

    const res = await ACTIVATE(req({}, "POST"), ctx);

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});

describe("PATCH (แก้ไขข้อมูลโมเดล)", () => {
  it("ผู้ใช้ทั่วไปแก้ไม่ได้ (403)", async () => {
    m.auth.mockResolvedValue(USER);

    const res = await PATCH(req({}, "PATCH", { name: "n", version: "v" }), ctx);

    expect(res.status).toBe(403);
    expect(m.editModelLogic).not.toHaveBeenCalled();
  });

  it("ไม่กรอกชื่อ ตอบ 400 และไม่แก้ฐานข้อมูล", async () => {
    m.auth.mockResolvedValue(ADMIN);

    const res = await PATCH(req({}, "PATCH", { name: " ", version: "v" }), ctx);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("ชื่อโมเดล");
    expect(m.editModelLogic).not.toHaveBeenCalled();
  });

  it("body ไม่ใช่ JSON ตอบ 400", async () => {
    m.auth.mockResolvedValue(ADMIN);
    const bad = new Request("http://localhost/api/models/model1", {
      method: "PATCH",
      body: "{oops",
    });

    expect((await PATCH(bad, ctx)).status).toBe(400);
  });

  it("ผู้ดูแลระบบแก้ได้ ชื่อถูกตัดช่องว่าง และส่งค่าประเมินต่อ", async () => {
    m.auth.mockResolvedValue(ADMIN);

    const res = await PATCH(
      req({}, "PATCH", { name: " YOLO ", version: "v2", mAP50: "80" }),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(m.editModelLogic).toHaveBeenCalledWith("model1", {
      name: "YOLO",
      version: "v2",
      mAP50: "80",
    });
  });
});

describe("PUT /tta (เปิด/ปิด Test-Time Augmentation)", () => {
  it("ผู้ใช้ทั่วไปเปลี่ยนไม่ได้ (403)", async () => {
    m.auth.mockResolvedValue(USER);

    const res = await SET_TTA(req({}, "PUT", { enabled: true }), ctx);

    expect(res.status).toBe(403);
    expect(m.setModelTtaLogic).not.toHaveBeenCalled();
  });

  it("enabled ไม่ใช่ true/false ตอบ 400", async () => {
    m.auth.mockResolvedValue(ADMIN);

    const res = await SET_TTA(req({}, "PUT", { enabled: "yes" }), ctx);

    expect(res.status).toBe(400);
    expect(m.setModelTtaLogic).not.toHaveBeenCalled();
  });

  it.each([true, false])("ผู้ดูแลระบบตั้ง enabled=%s ได้", async (enabled) => {
    m.auth.mockResolvedValue(ADMIN);

    const res = await SET_TTA(req({}, "PUT", { enabled }), ctx);

    expect(res.status).toBe(200);
    expect(m.setModelTtaLogic).toHaveBeenCalledWith("model1", enabled);
  });

  it("ไม่พบโมเดล ตอบ 404", async () => {
    m.auth.mockResolvedValue(ADMIN);
    m.setModelTtaLogic.mockRejectedValueOnce(
      new HttpError(404, "ไม่พบข้อมูลโมเดล"),
    );

    const res = await SET_TTA(req({}, "PUT", { enabled: true }), ctx);

    expect(res.status).toBe(404);
  });
});
