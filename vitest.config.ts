import { defineConfig } from "vitest/config";
import path from "path";

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // ignore if .env.local doesn't exist
}

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
