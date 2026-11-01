import { z } from "zod";
import { MODEL_METRICS } from "@/types/analyze";

const requiredText = (label: string) =>
  z
    .string({ error: `กรุณากรอก${label}` })
    .trim()
    .min(1, `กรุณากรอก${label}`)
    .max(100, `${label}ยาวเกิน 100 ตัวอักษร`);

// ค่าประเมินรับเป็นตัวเลขหรือข้อความจากฟอร์ม — ตรวจช่วง 0–100 ต่อใน parseModelMetrics
const metricShape = Object.fromEntries(
  MODEL_METRICS.map(({ key }) => [
    key,
    z.union([z.number(), z.string(), z.null()]).optional(),
  ]),
) as Record<
  (typeof MODEL_METRICS)[number]["key"],
  z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>
>;

export const modelInfoSchema = z.object({
  name: requiredText("ชื่อโมเดล"),
  version: requiredText("เวอร์ชัน"),
  description: z
    .string()
    .max(1000, "รายละเอียดยาวเกิน 1000 ตัวอักษร")
    .optional()
    .nullable(),
});

export const startUploadSchema = modelInfoSchema.extend({
  fileName: z.string().trim().min(1, "ไม่พบชื่อไฟล์"),
  sizeBytes: z
    .number()
    .int()
    .positive("ไฟล์โมเดลว่างเปล่า")
    .max(Number.MAX_SAFE_INTEGER),
});

export const editModelSchema = modelInfoSchema.extend(metricShape);

export const idListSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "กรุณาเลือกอย่างน้อย 1 รายการ"),
});
