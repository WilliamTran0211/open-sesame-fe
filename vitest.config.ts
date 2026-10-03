import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the framework-free helpers in app/utils.
export default defineConfig({
  resolve: {
    alias: { "~": fileURLToPath(new URL("./app", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
