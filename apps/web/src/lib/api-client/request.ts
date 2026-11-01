// ตัวช่วยเรียก API ของเว็บจากฝั่งเบราว์เซอร์ — ไม่ throw แต่คืน { error } เป็นภาษาไทยเสมอ
export type ApiResult<T extends object = object> = Partial<T> & {
  success?: boolean;
  error?: string;
};

type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** FormData และ Blob/File ส่งตรง อย่างอื่นแปลงเป็น JSON */
  body?: FormData | Blob | object;
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
  const isRaw = body instanceof FormData || body instanceof Blob;
  const headers: HeadersInit | undefined =
    body instanceof Blob
      ? { "Content-Type": "application/octet-stream" }
      : body && !isRaw
        ? { "Content-Type": "application/json" }
        : undefined;
  try {
    const response = await fetch(url, {
      method,
      headers,
      body:
        body === undefined ? undefined : isRaw ? body : JSON.stringify(body),
    });

    const result: ApiResult<T> = await response.json().catch(() => ({}));
    // 413 ที่ไม่มีข้อความ = ผู้ให้บริการปฏิเสธก่อนถึงโค้ดของระบบ
    if (response.status === 413 && !result.error && tooLargeError)
      return failure<T>(tooLargeError);
    if (!response.ok) return failure<T>(result.error || fallbackError);
    return result;
  } catch (error) {
    console.error(`API ${method} ${url} failed:`, error);
    return failure<T>(fallbackError);
  }
}

/**
 * ส่งไฟล์ (POST body = ไฟล์ตรง ๆ) พร้อมรายงานความคืบหน้า — fetch ยังรายงานการส่งไม่ได้ จึงใช้ XMLHttpRequest
 * คืนผลแบบเดียวกับ apiRequest (ไม่ throw)
 */
export function uploadWithProgress<T extends object = object>(
  url: string,
  file: Blob,
  {
    fallbackError,
    tooLargeError,
    onProgress,
  }: {
    fallbackError: string;
    tooLargeError?: string;
    onProgress?: (fraction: number) => void;
  },
): Promise<ApiResult<T>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      let result: ApiResult<T> = {};
      try {
        result = JSON.parse(xhr.responseText) as ApiResult<T>;
      } catch {
        // ผู้ให้บริการตอบเป็นหน้า HTML (เช่น 413 ของ Vercel)
      }
      if (xhr.status === 413 && !result.error && tooLargeError) {
        return resolve(failure<T>(tooLargeError));
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        return resolve(failure<T>(result.error || fallbackError));
      }
      resolve(result);
    };
    xhr.onerror = () => resolve(failure<T>(fallbackError));
    xhr.send(file);
  });
}
