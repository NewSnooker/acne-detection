import { beforeEach, describe, expect, it, vi } from "vitest";

// เก็บไฟล์โมเดลใน MongoDB แบบหั่นชิ้น (ขอบเขตข้อ 1.3.1.4) — จำลองฐานข้อมูล
const db = vi.hoisted(() => ({
  aiModel: {
    create: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  aiModelChunk: { upsert: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  MODEL_CHUNK_SIZE,
  completeChunkedUpload,
  expectedChunkSize,
  modelDownloadParts,
  saveModelChunk,
  startChunkedUpload,
} from "./model-chunks";

const MB = 1024 * 1024;
const uploading = (sizeBytes: number) => ({
  provider: "chunks",
  sizeBytes,
  chunkCount: Math.ceil(sizeBytes / MODEL_CHUNK_SIZE),
  uploadComplete: false,
});
const bytes = (n: number) => Buffer.alloc(n);

beforeEach(() => {
  Object.values(db.aiModel).forEach((fn) => fn.mockReset());
  Object.values(db.aiModelChunk).forEach((fn) => fn.mockReset());
  db.aiModel.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "m1",
      ...data,
    }),
  );
});

describe("startChunkedUpload", () => {
  const input = {
    originalName: "../โมเดล L.pt",
    sizeBytes: 100 * MB + 1,
    name: "L",
    version: "1",
    description: "",
    userId: "a1",
  };

  it("ไฟล์ 100 MB ขึ้นไปได้ (ไม่จำกัดขนาด) แบ่งเป็นชิ้นละ 4 MB และยังไม่เปิดใช้", async () => {
    await startChunkedUpload(input);

    const { data } = db.aiModel.create.mock.calls[0][0];
    expect(data).toMatchObject({
      provider: "chunks",
      sizeBytes: 100 * MB + 1,
      chunkCount: 26,
      uploadComplete: false,
      isActive: false,
      uploadedBy: "a1",
    });
    expect(data.fileName).toMatch(/^[0-9a-f]{16}_[a-zA-Z0-9._-]+\.pt$/);
  });

  it.each([
    [{ originalName: "model.onnx" }, ".pt"],
    [{ sizeBytes: 0 }, "ว่างเปล่า"],
  ])("ไม่รับ %o", async (override, message) => {
    await expect(startChunkedUpload({ ...input, ...override })).rejects.toThrow(
      message,
    );
    expect(db.aiModel.create).not.toHaveBeenCalled();
  });
});

describe("expectedChunkSize", () => {
  it("ทุกชิ้นเต็ม 4 MB ยกเว้นชิ้นสุดท้าย", () => {
    const size = 2 * MODEL_CHUNK_SIZE + 10;
    expect(expectedChunkSize(0, size, 3)).toBe(MODEL_CHUNK_SIZE);
    expect(expectedChunkSize(2, size, 3)).toBe(10);
    expect(expectedChunkSize(0, 10, 1)).toBe(10);
  });
});

describe("saveModelChunk", () => {
  it("บันทึกชิ้นด้วย upsert (ส่งซ้ำได้ตอนลองใหม่)", async () => {
    db.aiModel.findUnique.mockResolvedValue(uploading(MODEL_CHUNK_SIZE + 5));

    await saveModelChunk("m1", 1, bytes(5));

    expect(db.aiModelChunk.upsert).toHaveBeenCalledWith({
      where: { modelId_index: { modelId: "m1", index: 1 } },
      create: { modelId: "m1", index: 1, data: bytes(5) },
      update: { data: bytes(5) },
    });
  });

  it("ขนาดชิ้นไม่ตรง หรือ index เกิน ตอบ 400", async () => {
    db.aiModel.findUnique.mockResolvedValue(uploading(MODEL_CHUNK_SIZE + 5));

    await expect(saveModelChunk("m1", 1, bytes(4))).rejects.toMatchObject({
      status: 400,
    });
    await expect(saveModelChunk("m1", 2, bytes(5))).rejects.toMatchObject({
      status: 400,
    });
    expect(db.aiModelChunk.upsert).not.toHaveBeenCalled();
  });

  it("โมเดลที่อัปโหลดเสร็จแล้วรับชิ้นเพิ่มไม่ได้ (409), ไม่พบ (404)", async () => {
    db.aiModel.findUnique.mockResolvedValueOnce({
      ...uploading(10),
      uploadComplete: true,
    });
    await expect(saveModelChunk("m1", 0, bytes(10))).rejects.toMatchObject({
      status: 409,
    });

    db.aiModel.findUnique.mockResolvedValueOnce(null);
    await expect(saveModelChunk("x", 0, bytes(10))).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("completeChunkedUpload", () => {
  it("ชิ้นครบ → เปิดใช้ และเป็นโมเดลหลักถ้ายังไม่มี", async () => {
    db.aiModel.findUnique.mockResolvedValue(uploading(2 * MODEL_CHUNK_SIZE));
    db.aiModelChunk.count.mockResolvedValue(2);
    db.aiModel.count.mockResolvedValue(0);

    await completeChunkedUpload("m1");

    expect(db.aiModel.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { uploadComplete: true, isActive: true },
      omit: { modelData: true },
    });
  });

  it("ชิ้นไม่ครบ ตอบ 409 และยังไม่เปิดใช้", async () => {
    db.aiModel.findUnique.mockResolvedValue(uploading(2 * MODEL_CHUNK_SIZE));
    db.aiModelChunk.count.mockResolvedValue(1);

    await expect(completeChunkedUpload("m1")).rejects.toMatchObject({
      status: 409,
    });
    expect(db.aiModel.update).not.toHaveBeenCalled();
  });
});

describe("modelDownloadParts", () => {
  it("แบบหั่นชิ้น = path ของทุกชิ้นตามลำดับ", async () => {
    db.aiModel.findUnique.mockResolvedValue({
      provider: "chunks",
      chunkCount: 3,
      uploadComplete: true,
    });

    expect(await modelDownloadParts("m1")).toEqual([
      "/api/models/m1/chunks/0",
      "/api/models/m1/chunks/1",
      "/api/models/m1/chunks/2",
    ]);
  });

  it("แบบเก่า (mongodb / file) = ไฟล์เดียวจาก /api/models/[id]", async () => {
    db.aiModel.findUnique.mockResolvedValue({
      provider: "mongodb",
      chunkCount: null,
      uploadComplete: null,
    });

    expect(await modelDownloadParts("m1")).toEqual(["/api/models/m1"]);
  });

  it("ยังอัปโหลดไม่ครบ 409, ไม่พบ 404", async () => {
    db.aiModel.findUnique.mockResolvedValueOnce({
      provider: "chunks",
      chunkCount: 3,
      uploadComplete: false,
    });
    await expect(modelDownloadParts("m1")).rejects.toMatchObject({
      status: 409,
    });
    db.aiModel.findUnique.mockResolvedValueOnce(null);
    await expect(modelDownloadParts("x")).rejects.toMatchObject({
      status: 404,
    });
  });
});
