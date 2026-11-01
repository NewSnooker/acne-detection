"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

// ข้อความแจ้งผลมุมจอ (แทน alert ของเบราว์เซอร์) — สีตามโหมดสว่าง/มืดของเว็บ
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ className: "font-sans" }}
    />
  );
}
