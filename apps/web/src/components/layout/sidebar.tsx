"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  ScanFace,
  History,
  Users,
  ChevronRight,
  Activity,
  BrainCircuit,
} from "lucide-react";

const userNav = [
  { href: "/analyze", label: "วิเคราะห์สิวด้วย AI", icon: ScanFace },
  { href: "/statistics", label: "ภาพรวมของฉัน", icon: Activity },
  { href: "/history", label: "ประวัติการวิเคราะห์", icon: History },
];

const adminNav = [
  { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users },
  { href: "/admin/models", label: "จัดการโมเดล AI", icon: BrainCircuit },
  { href: "/admin/statistics", label: "ภาพรวมระบบ", icon: Activity },
  {
    href: "/admin/history",
    label: "ประวัติการวิเคราะห์ทั้งหมด",
    icon: History,
  },
];

export function SidebarContent({
  role,
  onNavigate,
}: {
  role: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="border-b px-6 py-5">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="กลับหน้าแรก"
          className="inline-flex rounded-lg transition-opacity hover:opacity-80"
        >
          <BrandLogo size="sm" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {userNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {active && <ChevronRight className="ml-auto h-3 w-3" />}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="text-muted-foreground mt-6 mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
              Admin
            </div>
            {adminNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );
}

export function Sidebar({ role }: { role: string }) {
  return (
    <aside className="bg-card hidden w-64 shrink-0 flex-col border-r md:flex">
      <SidebarContent role={role} />
    </aside>
  );
}
