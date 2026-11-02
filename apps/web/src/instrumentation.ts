// รันครั้งเดียวตอนเซิร์ฟเวอร์ Next.js เริ่ม — ตั้งค่าที่เก็บไฟล์ผิดชุดให้หยุดตั้งแต่ต้น ไม่ใช่ไปพังตอนใช้งาน
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { storageConfigProblem, imageStorage, modelStorage } =
    await import("@/lib/storage/config");
  const problem = storageConfigProblem();
  if (problem) throw new Error(problem);
  // เรียกเพื่อให้ค่า env ที่สะกดผิดแจ้ง error ตั้งแต่เริ่ม
  imageStorage();
  modelStorage();
}
