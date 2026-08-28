import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
  .max(20, "รหัสผ่านต้องไม่เกิน 20 ตัวอักษร")
  .regex(/[a-z]/, "รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว")
  .regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");

export const loginSchema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล").email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(5, "ชื่อต้องมีอย่างน้อย 5 ตัวอักษร")
      .max(20, "ชื่อต้องไม่เกิน 20 ตัวอักษร"),
    email: z.string().min(1, "กรุณากรอกอีเมล").email("อีเมลไม่ถูกต้อง"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
