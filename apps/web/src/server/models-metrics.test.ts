import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ดึงค่าประเมินโมเดลจากไฟล์ .pt ผ่านบริการ AI (ขอบเขตข้อ 1.3.3.3)
const db = vi.hoisted(() => ({
  aiModel: { count: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  aiErrorMessage,
  importModelMetricsLogic,
  pickImportedMetrics,
} from "./models";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AI_SERVICE_URL", "http://ai:8000");
  vi.stubEnv("AI_SERVICE_API_KEY", "k");
  vi.stubEnv("INTERNAL_APP_URL", "http://web:3000");
  fetchMock.mockReset();
  db.aiModel.count.mockReset().mockResolvedValue(1);
  db.aiModel.update.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("pickImportedMetrics", () => {
  it("เก็บเฉพาะฟิลด์ที่รู้จักและเป็นตัวเลข 0–100", () => {
    expect(
      pickImportedMetrics({
        metrics: {
          mAP50: 76.5,
          precision: 101,
          recall: "70",
          f1Score: 75,
          accuracy: 90,
        },
      }),
    ).toEqual({ mAP50: 76.5, f1Score: 75 });
    expect(pickImportedMetrics(null)).toEqual({});
    expect(pickImportedMetrics({ metrics: "x" })).toEqual({});
  });
});

describe("importModelMetricsLogic", () => {
  it("ส่ง URL ของโมเดลพร้อม key ให้บริการ AI แล้วบันทึกค่าที่ได้", async () => {
    fetchMock.mockResolvedValue(
      json({
        metrics: {
          mAP50: 76.54,
          precision: 81.23,
          recall: 70.11,
          f1Score: 75.26,
        },
      }),
    );

    const metrics = await importModelMetricsLogic("m1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://ai:8000/model-metrics");
    expect(init.headers).toEqual({ "X-API-Key": "k" });
    expect((init.body as FormData).get("model_url_or_path")).toBe(
      "http://web:3000/api/models/m1",
    );
    expect(db.aiModel.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: metrics,
    });
    expect(metrics).toEqual({
      mAP50: 76.54,
      precision: 81.23,
      recall: 70.11,
      f1Score: 75.26,
    });
  });

  it("ไม่พบโมเดล ตอบ 404 และไม่เรียกบริการ AI", async () => {
    db.aiModel.count.mockResolvedValue(0);

    await expect(importModelMetricsLogic("none")).rejects.toMatchObject({
      status: 404,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ไฟล์ไม่มีผลเทรน ตอบ 422 และไม่แก้ฐานข้อมูล", async () => {
    fetchMock.mockResolvedValue(json({ metrics: {} }));

    await expect(importModelMetricsLogic("m1")).rejects.toMatchObject({
      status: 422,
    });
    expect(db.aiModel.update).not.toHaveBeenCalled();
  });

  it("บริการ AI ตอบ error หรือเชื่อมต่อไม่ได้ ตอบ 502", async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: "bad" }, 422));
    await expect(importModelMetricsLogic("m1")).rejects.toMatchObject({
      status: 502,
    });

    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(importModelMetricsLogic("m1")).rejects.toMatchObject({
      status: 502,
    });
  });
});

describe("aiErrorMessage", () => {
  it("บอกสาเหตุตามรหัสที่ FastAPI ตอบ", () => {
    expect(aiErrorMessage(403)).toContain("AI_SERVICE_API_KEY");
    expect(aiErrorMessage(404)).toContain("เริ่มบริการ AI ใหม่");
    expect(aiErrorMessage(422)).toContain("ไฟล์อาจเสีย");
    expect(aiErrorMessage(500)).toContain("รหัส 500");
  });
});
