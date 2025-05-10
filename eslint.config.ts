import { includeIgnoreFile } from "@eslint/compat";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginAstro from "eslint-plugin-astro";
import { defineConfig } from "eslint/config";
import { fileURLToPath } from "node:url";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default defineConfig([
  {
    ignores: ["eslint.config.ts"],
  },
  includeIgnoreFile(gitignorePath),
  eslintConfigPrettier,
  ...eslintPluginAstro.configs.recommended,
]);
