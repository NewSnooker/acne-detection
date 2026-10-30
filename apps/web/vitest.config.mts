import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// ตั้งค่าชุดทดสอบ (รันด้วย `npm test`)
// ใช้นามสกุล .mts เพื่อให้โหลดแบบ ES Module ได้บน Node ทุกรุ่นที่รองรับ
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only โยน error เมื่อไม่ได้รันใน React Server Components — ในเทสต์ให้เป็นโมดูลว่าง
      "server-only": fileURLToPath(
        new URL("./src/test/empty-module.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
