import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  devToolbar: {
    enabled: true,
  },
  env: {
    schema: {
      FLARE_URL: envField.string({
        context: "client",
        access: "public",
        optional: false,
      }),
      DATA_CHANNEL: envField.string({
        context: "client",
        access: "public",
        optional: false,
      }),
    },
  },
  prefetch: {
    defaultStrategy: "viewport",
    prefetchAll: true,
  },
  experimental: {
    fonts: [
      {
        provider: "local",
        name: "Inter",
        cssVariable: "--font-inter",
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: ["./src/assets/fonts/InterVariable.woff2"],
          },
          {
            weight: "100 900",
            style: "italic",
            src: ["./src/assets/fonts/InterVariable-Italic.woff2"],
          },
        ],
      },
    ],
    clientPrerender: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});
