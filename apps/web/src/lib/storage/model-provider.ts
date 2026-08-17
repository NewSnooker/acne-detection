export type ModelUploadResult = {
  filePath: string;
  modelData: Buffer | null;
  provider: "local" | "mongodb";
};

export async function saveModel(
  file: File,
  _fileName: string,
): Promise<ModelUploadResult> {
  // ─── เก็บ Binary ลง MongoDB ทุก environment ───
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    filePath: "",
    modelData: buffer,
    provider: "mongodb",
  };
}

export async function deleteModelFile(
  _provider: string,
  _filePath: string,
): Promise<void> {
  // โมเดลอยู่ใน MongoDB — ลบ record = ลบข้อมูลทิ้งอัตโนมัติ (ไม่ต้องทำอะไรเพิ่ม)
}
