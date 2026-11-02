import { describe, expect, it } from "vitest";
import {
  imageStorage,
  maxModelUploadBytes,
  modelStorage,
  storageConfigProblem,
} from "./config";

// เลือกที่เก็บไฟล์จาก env และกันใช้ฐานข้อมูลคลาวด์ร่วมกับที่เก็บบนดิสก์ (dev-docs/environments.md)
const ATLAS = "mongodb+srv://u:p@cluster0.example.net/acne_db";
const DOCKER_DB = "mongodb://mongodb:27017/acne_db?replicaSet=rs0";

describe("imageStorage / modelStorage", () => {
  it("ค่าที่ตั้งตรง ๆ ชนะค่าเดา", () => {
    expect(imageStorage({ IMAGE_STORAGE: "vercel-blob" })).toBe("vercel-blob");
    expect(
      modelStorage({ MODEL_STORAGE: "mongodb", MODEL_STORAGE_PATH: "/x" }),
    ).toBe("mongodb");
  });

  it("ไม่ตั้ง = เดาจากค่าเดิม (APP_ENV=hosted, MODEL_STORAGE_PATH)", () => {
    expect(imageStorage({ APP_ENV: "hosted" })).toBe("vercel-blob");
    expect(imageStorage({})).toBe("local");
    expect(modelStorage({ MODEL_STORAGE_PATH: "/app/model-files" })).toBe(
      "file",
    );
    expect(modelStorage({})).toBe("mongodb");
  });

  it("สะกดผิด แจ้ง error พร้อมค่าที่ใช้ได้", () => {
    expect(() => imageStorage({ IMAGE_STORAGE: "s3" })).toThrow(
      "local, vercel-blob",
    );
  });
});

describe("maxModelUploadBytes", () => {
  it("file ไม่จำกัด, mongodb 15 MB, บน Vercel 4.5 MB", () => {
    const original = { ...process.env };
    try {
      process.env.MODEL_STORAGE = "file";
      process.env.MODEL_STORAGE_PATH = "/m";
      expect(maxModelUploadBytes()).toBeNull();
      process.env.MODEL_STORAGE = "mongodb";
      delete process.env.VERCEL;
      expect(maxModelUploadBytes()).toBe(15 * 1024 * 1024);
      process.env.VERCEL = "1";
      expect(maxModelUploadBytes()).toBe(4.5 * 1024 * 1024);
    } finally {
      process.env = original;
    }
  });
});

describe("storageConfigProblem", () => {
  it("Docker: ฐานข้อมูลของตัวเอง + ดิสก์ = ปลอดภัย", () => {
    expect(
      storageConfigProblem({
        DATABASE_URL: DOCKER_DB,
        IMAGE_STORAGE: "local",
        MODEL_STORAGE: "file",
        MODEL_STORAGE_PATH: "/m",
      }),
    ).toBeNull();
  });

  it("Vercel: Atlas + ที่เก็บบนคลาวด์ = ปลอดภัย", () => {
    expect(
      storageConfigProblem({ DATABASE_URL: ATLAS, APP_ENV: "hosted" }),
    ).toBeNull();
  });

  it("รันในเครื่องแต่ต่อ Atlas + เก็บรูปลงดิสก์ = ไม่ยอม (ต้นเหตุรูป/โมเดลหายบนเว็บจริง)", () => {
    expect(storageConfigProblem({ DATABASE_URL: ATLAS })).toContain(
      "IMAGE_STORAGE=local",
    );
    expect(
      storageConfigProblem({
        DATABASE_URL: ATLAS,
        APP_ENV: "hosted",
        MODEL_STORAGE_PATH: "/m",
      }),
    ).toContain("MODEL_STORAGE=file");
  });

  it("ตั้ง ALLOW_SHARED_DB=true ได้ถ้าตั้งใจ", () => {
    expect(
      storageConfigProblem({ DATABASE_URL: ATLAS, ALLOW_SHARED_DB: "true" }),
    ).toBeNull();
  });
});
