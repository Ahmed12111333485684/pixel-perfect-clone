import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // fileURLToPath keeps the path usable on Windows: a plain
      // new URL(...).pathname yields "/C:/..." with the spaces still encoded.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
});
