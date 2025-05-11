import type { Config } from "prettier";

const config: Config = {
  plugins: [
    "prettier-plugin-astro",
    "prettier-plugin-organize-imports",
    "prettier-plugin-astro-organize-imports",
    "prettier-plugin-tailwindcss",
  ],
  tailwindStylesheet: "./src/styles/global.css",
  tailwindFunctions: ["clsx", "cva"],
};

export default config;
