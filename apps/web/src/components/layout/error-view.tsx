"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// หน้าจอเมื่อเกิดข้อผิดพลาดที่ไม่คาดคิด (ใช้ใน error.tsx) — ไม่แสดงรายละเอียดทางเทคนิคให้ผู้ใช้
export function ErrorView({
  error,
  retry,
  homeHref = "/",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      className="min-h-[60vh]"
      title="เกิดข้อผิดพลาด ไม่สามารถแสดงหน้านี้ได้"
      description={`ลองโหลดใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งผู้ดูแลระบบ${
        error.digest ? ` (รหัสอ้างอิง ${error.digest})` : ""
      }`}
    >
      <Button onClick={retry}>
        <RotateCcw className="mr-2 h-4 w-4" />
        ลองใหม่
      </Button>
      <Button variant="outline" asChild>
        <Link href={homeHref}>กลับหน้าแรก</Link>
      </Button>
    </EmptyState>
  );
}
