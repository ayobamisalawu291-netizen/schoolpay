import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"], exclude: [...configDefaults.exclude, "**/._*"] },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } }
});
