import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeControls } from "@/components/theme/theme-controls";
import { siteConfig } from "@/config/site";
import { PublicNav } from "@/components/public/public-nav";
import { PUBLIC_NAV } from "@/components/public/nav-items";

// หน้าสาธารณะ (หน้าแรก, หน้าความรู้) — คนที่ยังไม่เข้าสู่ระบบเปิดได้
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="bg-background/90 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label={`${siteConfig.name} หน้าแรก`}>
            <BrandLogo size="md" showTagline={false} />
          </Link>
          <PublicNav />
          <div className="flex items-center gap-2">
            <ThemeControls />
            {!session && (
              <Button
                asChild
                variant="ghost"
                className="hidden rounded-full sm:inline-flex"
              >
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
            )}
            <Button asChild className="rounded-full">
              <Link href="/analyze">
                {session ? "ไปที่แดชบอร์ด" : "เริ่มวิเคราะห์ผิว"}
              </Link>
            </Button>
          </div>
        </div>
        <PublicNav mobile />
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-card border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <BrandLogo size="sm" />
            <p className="text-muted-foreground">
              ระบบตรวจจับและจำแนกสิว 6 ชนิดจากภาพถ่ายใบหน้า
              พร้อมประเมินความรุนแรงและคำแนะนำดูแลผิว
            </p>
          </div>
          <nav aria-label="ลิงก์ท้ายเว็บ" className="flex flex-col gap-2">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="text-muted-foreground flex flex-col gap-2">
            <p>ไม่ใช่เครื่องมือทางการแพทย์ ผลเป็นการประเมินเบื้องต้นเท่านั้น</p>
            <p>
              ภาพตัวอย่างจากชุดข้อมูล{" "}
              <a
                href="https://universe.roboflow.com/-mqoyk/acne-ygqhs-w99jc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                acne
              </a>{" "}
              และ{" "}
              <a
                href="https://universe.roboflow.com/s-workspace-fmu4q/acne-dataset-6-classes-ubwa5"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Acne14k
              </a>{" "}
              (Roboflow Universe) สัญญาอนุญาต CC BY 4.0
            </p>
            <p>
              © {new Date().getFullYear()} {siteConfig.name} · โครงงานนักศึกษา
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
