"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ScanFace,
  History,
  Users,
  Cpu,
  ChevronRight,
  Activity,
} from "lucide-react";

const userNav = [
  { href: "/analyze", label: "วิเคราะห์สิว", icon: ScanFace },
  { href: "/statistics", label: "สถิติของฉัน", icon: LayoutDashboard },
  { href: "/history", label: "ประวัติการวิเคราะห์", icon: History },
];

const adminNav = [
  { href: "/admin/statistics", label: "สถิติผู้ใช้งานและระบบ", icon: Activity },
  { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users },
  { href: "/admin/models", label: "จัดการโมเดล", icon: Cpu },
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
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <span className="text-xl">🔬</span>
        </div>
        <div>
          <p className="font-bold text-sm">AcneAI</p>
          <p className="text-xs text-muted-foreground">วิเคราะห์สิวด้วย AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
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
                  ? "bg-primary text-primary-foreground shadow-sm"
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
            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                      ? "bg-primary text-primary-foreground shadow-sm"
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
    <aside className="hidden md:flex w-64 flex-col border-r bg-card shrink-0">
      <SidebarContent role={role} />
    </aside>
  );
}
