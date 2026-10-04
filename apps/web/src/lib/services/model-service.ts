import { prisma } from "@/lib/prisma";

export async function getAdminModels() {
  // ไม่ดึง modelData (ตัวไฟล์ .pt หลาย MB) เพราะหน้าตารางไม่ได้ใช้
  // ถ้าดึงมา ข้อมูลทั้งไฟล์จะถูกส่งไปที่เบราว์เซอร์ทุกครั้งที่เปิดหน้า
  const models = await prisma.aiModel.findMany({
    orderBy: { createdAt: "desc" },
    omit: { modelData: true },
    include: {
      _count: {
        select: { analyses: true },
      },
    },
  });
  return models.map((model) => ({ ...model, modelData: null }));
}
