import { registerSchema } from "@/schemas/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registerUserLogic(data: any) {
  const parsed = registerSchema.safeParse(data);
  
  if (!parsed.success) {
    throw new Error("ข้อมูลไม่ถูกต้อง");
  }

  // 1. เช็คอีเมลซ้ำ
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });

  if (existing) {
    throw new Error("อีเมลนี้ถูกใช้งานแล้ว");
  }

  // 2. เข้ารหัสรหัสผ่าน
  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  // 3. สร้าง User
  const newUser = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      // คนแรกที่สมัครจะเป็น ADMIN เสมอ นอกนั้นเป็น USER
      role: await prisma.user.count() === 0 ? "ADMIN" : "USER"
    }
  });

  return newUser;
}
