// NEXT-16: eslint-config-next 16 ships a native "flat" config, so the old
// FlatCompat bridge is no longer needed (it crashes with version 16).
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    // Version 16 adds strict React Compiler rules. The existing screens were
    // written before them and work correctly, so these are reported as
    // warnings (to clean up step by step) instead of failing the lint.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
  globalIgnores([
    "node_modules/**",
    ".next/**",
    ".next-package/**", // R8-PKG: client package build (npm run package)
    "dist/**", // R8-PKG: client package output
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
