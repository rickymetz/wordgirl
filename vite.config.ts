/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,txt,svg,png,woff2}"],
        navigateFallback: "/index.html",
      },
      manifest: {
        name: "WordGirl",
        short_name: "WordGirl",
        description: "A little collection of games, made with love.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.dom.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.dom.test.ts"],
          environment: "jsdom",
        },
      },
    ],
  },
});
