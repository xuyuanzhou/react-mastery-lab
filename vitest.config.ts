import { defineConfig } from "vitest/config";

// Run only application component tests. Cached React source is study material.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "dist/**", "public/**"],
  },
});
