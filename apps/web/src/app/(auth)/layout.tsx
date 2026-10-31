import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeControls } from "@/components/theme/theme-controls";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="from-background via-accent/20 to-background relative flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <ThemeControls className="absolute top-4 right-4" />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            aria-label="กลับหน้าแรก"
            className="rounded-lg transition-opacity hover:opacity-80"
          >
            <BrandLogo size="lg" stacked />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
