// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://wordgirl.net",
  base: "/docs",
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  integrations: [
    starlight({
      title: "WordGirl Docs",
      description:
        "How the WordGirl daily word games work — rules, math, and the code behind them.",
      social: [
        {
          icon: "external",
          label: "Play WordGirl",
          href: "https://wordgirl.net",
        },
      ],
      customCss: ["./src/styles/custom.css", "katex/dist/katex.min.css"],
      components: {
        PageTitle: "./src/components/PageTitle.astro",
      },
      sidebar: [
        {
          label: "The Games",
          items: [
            { label: "Polygram", slug: "games/polygram" },
            { label: "Crosshatch", slug: "games/crosshatch" },
            { label: "Pierglass", slug: "games/pierglass" },
            { label: "Doublet", slug: "games/doublet" },
            { label: "Serpentine", slug: "games/serpentine" },
            { label: "How daily puzzles work", slug: "games/daily-puzzles" },
            { label: "Streaks, modes, and the app", slug: "games/player-guide" },
          ],
        },
        {
          label: "Architecture",
          items: [
            { label: "Overview", slug: "architecture/overview" },
            { label: "PWA and offline", slug: "architecture/pwa-offline" },
            { label: "Data storage and streaks", slug: "architecture/persistence" },
            { label: "The dictionary", slug: "architecture/dictionary" },
          ],
        },
        {
          label: "Game Kit",
          items: [
            { label: "Components", slug: "kit/components" },
            { label: "Hooks and utilities", slug: "kit/utilities" },
          ],
        },
        {
          label: "Design System",
          items: [
            { label: "Color and themes", slug: "design/colors" },
            { label: "Layout, motion, and text", slug: "design/layout-motion" },
            { label: "Charts", slug: "design/charts" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "How to add a new game", slug: "guides/adding-a-game" },
            { label: "Tests and checks", slug: "guides/testing" },
          ],
        },
      ],
    }),
  ],
});
