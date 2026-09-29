import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", ".next.failedbuild/**", "out/**", "build/**", "next-env.d.ts", "node_modules.interrupted/**", "**/._*"]),
  { rules: { "react/no-unescaped-entities": "off" } }
]);
