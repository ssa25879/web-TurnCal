import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 배포 경로는 빌드 명령의 --base로 정한다(GitHub Pages: --base=/web-TurnCal/).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
