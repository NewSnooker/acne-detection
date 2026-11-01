import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "ไม่พบหน้าที่ต้องการ" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center p-6">
      <EmptyState
        icon={SearchX}
        className="w-full"
        title="ไม่พบหน้าที่ต้องการ (404)"
        description="ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว"
      >
        <Button asChild>
          <Link href="/">กลับหน้าแรก</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/analyze">ไปหน้าวิเคราะห์สิว</Link>
        </Button>
      </EmptyState>
    </main>
  );
}
