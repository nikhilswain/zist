// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

const prebundleDeps = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "@radix-ui/react-accordion",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-aspect-ratio",
  "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-collapsible",
  "@radix-ui/react-context-menu",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card",
  "@radix-ui/react-label",
  "@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-progress",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slider",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-toggle",
  "@radix-ui/react-toggle-group",
  "@radix-ui/react-tooltip",
  "chart.js",
  "chartjs-adapter-date-fns",
  "cmdk",
  "embla-carousel-react",
  "input-otp",
  "lucide-react",
  "next-themes",
  "react-chartjs-2",
  "react-day-picker",
  "sonner",
  "vaul",
];

// https://astro.build/config
export default defineConfig({
  site: "https://zist.pages.dev",
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: prebundleDeps,
    },
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      alias: {
        ...(import.meta.env.PROD
          ? { "react-dom/server": "react-dom/server.edge" }
          : {}),
      },
    },
  },

  integrations: [react(), sitemap()],
  output: "server",
  adapter: cloudflare(),
});
