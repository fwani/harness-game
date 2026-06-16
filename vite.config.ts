import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // tsc 출력(dist)과 섞이지 않도록 UI 번들은 별도 디렉터리로.
    outDir: "dist-ui",
  },
  // 도메인 단위 테스트는 기존 그대로 node 환경에서 돌린다.
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
