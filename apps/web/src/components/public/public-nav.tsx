"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PUBLIC_NAV } from "./nav-items";

const SECTION_IDS = PUBLIC_NAV.map((item) => item.href.split("#")[1]);

// ไฮไลต์เมนูตามหัวข้อที่กำลังอ่านอยู่ (ทุกหัวข้ออยู่ในหน้าแรก)
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      // นับว่าอ่านหัวข้อนั้นอยู่เมื่อหัวข้ออยู่ช่วงบนของจอ
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [enabled]);

  return enabled ? active : null;
}

// เมนูหลักของหน้าสาธารณะ — mobile = แถบเลื่อนแนวนอนใต้ header
export function PublicNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const active = useActiveSection(pathname === "/");

  return (
    <nav
      aria-label={mobile ? "เมนูหลัก (มือถือ)" : "เมนูหลัก"}
      className={
        mobile
          ? "scrollbar-thin flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden"
          : "hidden items-center gap-1 lg:flex"
      }
    >
      {PUBLIC_NAV.map((item) => {
        const isActive = item.href === `/#${active}`;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "location" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
