// รันครั้งเดียวตอนเซิร์ฟเวอร์ Next.js เริ่ม — ตั้งค่าที่เก็บไฟล์ผิดชุดให้หยุดตั้งแต่ต้น ไม่ใช่ไปพังตอนใช้งาน
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { storageConfigProblem, imageStorage, modelStorage } =
    await import("@/lib/storage/config");
  const problem = storageConfigProblem();
  if (problem) throw new Error(problem);
  // เรียก imageStorage()/modelStorage() ให้ค่า env ที่สะกดผิดแจ้ง error ตั้งแต่เริ่ม
  // และบอกว่ารันโค้ด commit ไหน — เทียบกับ "ai start: commit ..." ของ ai ได้ว่า deploy ขึ้นครบทั้งคู่
  console.log(
    `web start: commit ${(process.env.GIT_SHA ?? "dev").slice(0, 7)} | image=${imageStorage()} model=${modelStorage()}`,
  );
}
