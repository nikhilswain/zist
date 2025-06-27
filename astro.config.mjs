// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://zist.pages.dev",
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react(), sitemap()],
  output: "server",
  adapter: cloudflare(),
});
