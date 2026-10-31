"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PUBLIC_NAV } from "./nav-items";


// เมนูหลักของหน้าสาธารณะ — แต่ละเมนูไปคนละหน้า ไฮไลต์หน้าที่เปิดอยู่
export function PublicNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

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
        const active = item.href === pathname;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              active
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
