"use client";

import "./globals.css";

// ใช้เมื่อ layout หลักพังเอง (แทนที่ทั้งหน้า จึงต้องมี <html> และ <body>)
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="th">
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <p className="text-lg font-semibold">เกิดข้อผิดพลาดร้ายแรง</p>
          <p className="text-muted-foreground text-sm">
            ลองโหลดหน้าใหม่ ถ้ายังไม่ได้ให้แจ้งผู้ดูแลระบบ
          </p>
          <button
            type="button"
            onClick={unstable_retry}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
