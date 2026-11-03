import { Readable } from "stream";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// เลือก IMAGE_STORAGE / MODEL_STORAGE = azure-blob แล้วรูปและโมเดลต้องไปที่ Azure Blob
// จำลองโมดูล azure-blob (ไม่ต่อ Azure จริง) ตรวจว่าเรียกถูก container และชื่อไฟล์
const blob = vi.hoisted(() => ({
  uploadBlobBuffer: vi.fn(),
  uploadBlobStream: vi.fn(),
  openBlob: vi.fn(),
  deleteBlob: vi.fn(),
  readOnlyBlobUrl: vi.fn(),
}));
vi.mock("@/lib/storage/azure-blob", () => blob);

import {
  deleteImage,
  imageUrlForAi,
  uploadImage,
} from "@/lib/storage/image-provider";
import {
  deleteModelFile,
  openModelFile,
  saveModel,
} from "@/lib/storage/model-provider";

function webStream(data: Buffer) {
  return Readable.toWeb(Readable.from([data])) as WebReadableStream<Uint8Array>;
}

beforeEach(() => {
  vi.stubEnv("IMAGE_STORAGE", "azure-blob");
  vi.stubEnv("MODEL_STORAGE", "azure-blob");
  for (const fn of Object.values(blob)) fn.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("รูปบน Azure Blob", () => {
  it("อัปโหลดลง container images ด้วยชื่อสุ่ม ไม่มี URL สาธารณะ", async () => {
    const file = new File([Buffer.from("JPEG")], "face.jpg");
    const result = await uploadImage(file, "jpeg");

    expect(result.imageProvider).toBe("azure-blob");
    expect(result.imageUrl).toBeNull();
    expect(result.originalImage).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(blob.uploadBlobBuffer).toHaveBeenCalledWith(
      "images",
      result.originalImage,
      expect.any(Buffer),
      "image/jpeg",
    );
  });

  it("ai ได้ลิงก์ SAS อายุสั้น ส่วน Vercel Blob ใช้ URL เดิม", async () => {
    blob.readOnlyBlobUrl.mockResolvedValue(
      "https://x.blob.core.windows.net/images/a.jpg?sig=1",
    );
    await expect(
      imageUrlForAi({
        originalImage: "a.jpg",
        imageUrl: null,
        imageProvider: "azure-blob",
      }),
    ).resolves.toContain("sig=1");
    expect(blob.readOnlyBlobUrl).toHaveBeenCalledWith("images", "a.jpg");

    await expect(
      imageUrlForAi({
        originalImage: "p",
        imageUrl: "https://v/p.jpg",
        imageProvider: "vercel-blob",
      }),
    ).resolves.toBe("https://v/p.jpg");
  });

  it("ลบรูปจาก container images", async () => {
    await deleteImage("a.jpg", "azure-blob");
    expect(blob.deleteBlob).toHaveBeenCalledWith("images", "a.jpg");
  });
});

describe("โมเดลบน Azure Blob", () => {
  it("stream ไฟล์ขึ้น container models และนับขนาดได้ถูกต้อง", async () => {
    let uploaded = 0;
    blob.uploadBlobStream.mockImplementation(async (_k, _n, data: Readable) => {
      for await (const chunk of data) uploaded += (chunk as Buffer).length;
    });

    const data = Buffer.alloc(20 * 1024 * 1024, 1); // ใหญ่กว่าเพดาน MongoDB ก็ได้
    const saved = await saveModel(webStream(data), "abc_best.pt");

    expect(saved).toEqual({
      filePath: "abc_best.pt",
      modelData: null,
      provider: "azure-blob",
      sizeBytes: data.length,
    });
    expect(uploaded).toBe(data.length);
    expect(blob.uploadBlobStream.mock.calls[0]?.slice(0, 2)).toEqual([
      "models",
      "abc_best.pt",
    ]);
  });

  it("อัปโหลดไม่สำเร็จ ลบไฟล์ที่ค้างทิ้ง", async () => {
    blob.uploadBlobStream.mockRejectedValue(new Error("network"));
    blob.deleteBlob.mockResolvedValue(undefined);
    await expect(
      saveModel(webStream(Buffer.from("x")), "b.pt"),
    ).rejects.toThrow("network");
    expect(blob.deleteBlob).toHaveBeenCalledWith("models", "b.pt");
  });

  it("เปิดและลบไฟล์จาก container models", async () => {
    blob.openBlob.mockResolvedValue(null);
    await expect(openModelFile("azure-blob", "c.pt")).resolves.toBeNull();
    expect(blob.openBlob).toHaveBeenCalledWith("models", "c.pt");

    await deleteModelFile("azure-blob", "c.pt");
    expect(blob.deleteBlob).toHaveBeenCalledWith("models", "c.pt");
  });
});
