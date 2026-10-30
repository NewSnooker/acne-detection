// ตัวช่วยเรียก API ของเว็บจากฝั่งเบราว์เซอร์ — ไม่ throw แต่คืน { error } เป็นภาษาไทยเสมอ
export type ApiResult<T extends object = object> = Partial<T> & {
  success?: boolean;
  error?: string;
};

type RequestOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  /** FormData ส่งตรง อย่างอื่นแปลงเป็น JSON */
  body?: FormData | object;
  /** ข้อความเมื่อเชื่อมต่อไม่ได้หรือเซิร์ฟเวอร์ไม่บอกเหตุผล */
  fallbackError: string;
  /** ข้อความเมื่อไฟล์ใหญ่เกินกว่าที่ผู้ให้บริการรับ (413 ถูกตอบก่อนถึงโค้ดของระบบ) */
  tooLargeError?: string;
};

// ทุกฟิลด์ของ T เป็น optional จึงคืนแค่ error ได้เสมอ — TS ตรวจข้อนี้กับ generic ไม่ได้เอง
const failure = <T extends object>(error: string) =>
  ({ error }) as ApiResult<T>;

export async function apiRequest<T extends object = object>(
  url: string,
  { method, body, fallbackError, tooLargeError }: RequestOptions,
): Promise<ApiResult<T>> {
  const isForm = body instanceof FormData;
  try {
    const response = await fetch(url, {
      method,
      headers:
        body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body:
        body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    if (response.status === 413 && tooLargeError)
      return failure<T>(tooLargeError);

    const result: ApiResult<T> = await response.json().catch(() => ({}));
    if (!response.ok) return failure<T>(result.error || fallbackError);
    return result;
  } catch (error) {
    console.error(`API ${method} ${url} failed:`, error);
    return failure<T>(fallbackError);
  }
}
