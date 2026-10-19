import Link from "next/link";
import { ScanFace } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/#types", label: "ชนิดของสิว" },
  { href: "/#model", label: "ความแม่นยำ" },
  { href: "/#severity", label: "ระดับความรุนแรง" },
  { href: "/knowledge", label: "ความรู้ดูแลผิว" },
  { href: "/#faq", label: "คำถามที่พบบ่อย" },
];

// หน้าสาธารณะ (หน้าแรก, หน้าความรู้) — คนที่ยังไม่เข้าสู่ระบบเปิดได้
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanFace className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              Acne<span className="text-primary">AI</span>
            </span>
          </Link>
          <nav aria-label="เมนูหลัก" className="hidden items-center gap-6 text-sm lg:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {!session && (
              <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
            )}
            <Button asChild className="rounded-full">
              <Link href="/analyze">{session ? "ไปที่แดชบอร์ด" : "เริ่มวิเคราะห์ผิว"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-lg font-bold">
              Acne<span className="text-primary">AI</span>
            </span>
            <p className="text-muted-foreground">ระบบตรวจจับและจำแนกสิว 6 ชนิดจากภาพถ่ายใบหน้า พร้อมประเมินความรุนแรงและคำแนะนำดูแลผิว</p>
          </div>
          <nav aria-label="ลิงก์ท้ายเว็บ" className="flex flex-col gap-2">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 text-muted-foreground">
            <p>ไม่ใช่เครื่องมือทางการแพทย์ ผลเป็นการประเมินเบื้องต้นเท่านั้น</p>
            <p>
              ภาพตัวอย่างจากชุดข้อมูล{" "}
              <a
                href="https://universe.roboflow.com/-mqoyk/acne-ygqhs-w99jc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                acne (Roboflow Universe)
              </a>{" "}
              สัญญาอนุญาต CC BY 4.0
            </p>
            <p>© {new Date().getFullYear()} AcneAI · โครงงานนักศึกษา</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
