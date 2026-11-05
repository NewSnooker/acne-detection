import { useSyncExternalStore } from "react";

// สีหลักของธีมที่ใช้อยู่ (ตาม data-palette และโหมดมืด/สว่าง) เป็น hex
// ใช้กับกราฟ ApexCharts ที่ต้องการสีเป็นค่า ไม่ใช่ CSS variable
const FALLBACK = "#1f6fd1";

function readPrimary(): string {
  const probe = document.createElement("span");
  probe.style.color = "hsl(var(--primary))";
  probe.style.display = "none";
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return FALLBACK;
  return (
    "#" +
    m
      .slice(0, 3)
      .map((v) => Math.round(Number(v)).toString(16).padStart(2, "0"))
      .join("")
  );
}

let cached = FALLBACK;

function subscribe(onChange: () => void) {
  const update = () => {
    const next = readPrimary();
    if (next !== cached) {
      cached = next;
      onChange();
    }
  };
  update();
  // เปลี่ยนธีมสี (data-palette) หรือโหมด (class="dark") ที่ <html>
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-palette", "style"],
  });
  return () => observer.disconnect();
}

export function usePrimaryColor() {
  return useSyncExternalStore(
    subscribe,
    () => cached,
    () => FALLBACK,
  );
}
