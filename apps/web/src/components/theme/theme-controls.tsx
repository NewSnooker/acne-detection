"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Moon, Palette, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_PALETTE,
  PALETTES,
  PALETTE_STORAGE_KEY,
  isPaletteKey,
  type PaletteKey,
} from "@/lib/theme/palettes";
import { cn } from "@/lib/utils";

const ICON_BUTTON =
  "text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2";

function readPalette(): PaletteKey {
  const current = document.documentElement.dataset.palette;
  return isPaletteKey(current) ? current : DEFAULT_PALETTE;
}

function applyPalette(key: PaletteKey) {
  const root = document.documentElement;
  if (key === DEFAULT_PALETTE) delete root.dataset.palette;
  else root.dataset.palette = key;
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, key);
  } catch {
    // เปิดแบบ private หรือปิด storage ไว้ — ใช้ได้แค่หน้านี้
  }
}

// ปุ่มสลับโหมดสว่าง/มืด + เลือกธีมสี ใช้ทั้งหน้าแรกและแดชบอร์ด
export function ThemeControls({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [palette, setPalette] = useState<PaletteKey>(DEFAULT_PALETTE);

  useEffect(() => {
    // อ่านค่าหลัง mount เท่านั้น เพราะฝั่ง server ไม่รู้ค่าที่ผู้ใช้เลือก
    const timer = setTimeout(() => {
      setPalette(readPalette());
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const choosePalette = (key: PaletteKey) => {
    applyPalette(key);
    setPalette(key);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={ICON_BUTTON}
          aria-label="เลือกธีมสี"
          title="เลือกธีมสี"
        >
          <Palette className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>ธีมสี</DropdownMenuLabel>
          {PALETTES.map((p) => (
            <DropdownMenuItem
              key={p.key}
              onSelect={() => choosePalette(p.key)}
              className="cursor-pointer gap-3"
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: p.swatch }}
              />
              <span className="flex-1">
                {p.label}
                {p.key === DEFAULT_PALETTE && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    (ค่าเริ่มต้น)
                  </span>
                )}
              </span>
              {mounted && palette === p.key && (
                <Check className="text-primary h-4 w-4" aria-hidden="true" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={ICON_BUTTON}
        aria-label={isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
        title={isDark ? "โหมดสว่าง" : "โหมดมืด"}
      >
        {!mounted ? (
          <span className="h-4 w-4" />
        ) : isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
