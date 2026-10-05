import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/schemas/auth";

export type AuthorizedUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
};

/**
 * ตรวจอีเมลและรหัสผ่านตอนเข้าสู่ระบบ (ใช้ใน Credentials provider ของ auth.ts)
 * คืนข้อมูลผู้ใช้ถ้าถูกต้อง คืน null ถ้าไม่ผ่าน — ไม่บอกว่าผิดที่อีเมลหรือรหัสผ่าน
 */
export async function authorizeCredentials(
  credentials: unknown,
): Promise<AuthorizedUser | null> {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // บัญชีที่สมัครด้วย Google ไม่มีรหัสผ่าน จึงเข้าด้วยรหัสผ่านไม่ได้
  if (!user || !user.password) return null;

  const isValid = await bcrypt.compare(parsed.data.password, user.password);
  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
  };
}
