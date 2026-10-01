import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "public/**",
      "content/**",
      "src/generated/**",
      "*.tsbuildinfo",
    ],
  },
  {
    files: ["scripts/**/*.mjs", "mini-react/**/*.mjs", "eslint.config.mjs"],
    languageOptions: { globals: globals.node },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "vite.config.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.flat.recommended.rules,
  },
);
