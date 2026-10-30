import { NextResponse } from "next/server";
import { z } from "zod";

// ข้อความ error มาตรฐานของ zod เป็นภาษาไทย (กรณี schema ไม่ได้กำหนดข้อความเอง)
z.config(z.locales.th());

/** error ที่ตั้งใจให้ผู้ใช้เห็น พร้อม HTTP status — โยนจาก service แล้ว route แปลงเป็น response */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** แปลง error เป็น JSON response: HttpError ใช้ข้อความของมัน อื่นๆ ซ่อนรายละเอียดไว้ใน log */
export function errorResponse(
  error: unknown,
  fallbackMessage: string,
  logLabel: string,
) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  console.error(`${logLabel} Error:`, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

/** ตรวจ body ด้วย zod — ไม่ผ่านจะโยน HttpError 400 พร้อมข้อความแรกของ schema */
export function parseBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues[0]?.message ?? "ข้อมูลที่ส่งมาไม่ถูกต้อง",
    );
  }
  return parsed.data;
}

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}
