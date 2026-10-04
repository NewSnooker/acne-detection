import path from "node:path";
import { defineConfig } from "vitest/config";

// ตั้งค่าชุดทดสอบ (รันด้วย `npm test`)
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
