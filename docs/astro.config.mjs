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
            { label: "Backwords", slug: "games/backwords" },
            { label: "Doublet", slug: "games/doublet" },
            { label: "Serpentine", slug: "games/serpentine" },
            { label: "How daily puzzles work", slug: "games/daily-puzzles" },
          ],
        },
        {
          label: "Architecture",
          items: [
            { label: "Overview", slug: "architecture/overview" },
            { label: "PWA & offline", slug: "architecture/pwa-offline" },
            { label: "Persistence & streaks", slug: "architecture/persistence" },
            { label: "The dictionary", slug: "architecture/dictionary" },
          ],
        },
        {
          label: "Game Kit",
          items: [
            { label: "Components", slug: "kit/components" },
            { label: "Hooks & utilities", slug: "kit/utilities" },
          ],
        },
        {
          label: "Design System",
          items: [
            { label: "Color & theming", slug: "design/colors" },
            { label: "Layout, motion & type", slug: "design/layout-motion" },
            { label: "Charts", slug: "design/charts" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Adding a new game", slug: "guides/adding-a-game" },
            { label: "Testing & verification", slug: "guides/testing" },
          ],
        },
      ],
    }),
  ],
});
