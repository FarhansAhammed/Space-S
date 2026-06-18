import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Core Layout Tones
        canvas: {
          bg: "#f8f5f0",      // Light warm beige cream
          dots: "#d0cbbf",    // Soft warm grey for dots
        },
        sidebar: {
          bg: "rgba(255, 255, 255, 0.8)",
          border: "rgba(0, 0, 0, 0.06)",
        },
        // Generations Edge/Accent Colors
        gen: {
          0: "#7c4dff", // Purple / Parent -> Child
          1: "#00b8d4", // Electric Teal / Child -> Grandchild
          2: "#ff9100", // Bright Orange / Grandchild -> Great-Grandchild
          3: "#ff1744", // Rose Red / Great-Grandchild -> GGreat-Grandchild
          4: "#607d8b", // Slate Gray / Deep generations
        },
        // Semantic Node Color Schemes (Border / Icons / Tint)
        node: {
          ai: {
            border: "rgba(124, 77, 255, 0.15)",
            bg: "rgba(124, 77, 255, 0.03)",
            accent: "#7c4dff",
          },
          note: {
            border: "rgba(216, 155, 0, 0.18)",
            bg: "rgba(255, 193, 7, 0.03)",
            accent: "#b78103",
          },
          image: {
            border: "rgba(76, 175, 80, 0.15)",
            bg: "rgba(76, 175, 80, 0.02)",
            accent: "#2e7d32",
          },
          doc: {
            border: "rgba(141, 110, 99, 0.2)",
            bg: "rgba(141, 110, 99, 0.03)",
            accent: "#6d4c41",
          },
          question: {
            border: "rgba(244, 67, 54, 0.15)",
            bg: "rgba(244, 67, 54, 0.02)",
            accent: "#c62828",
          },
        },
        text: {
          primary: "#1c1b18",
          secondary: "#6e6c64",
          muted: "#a19f96",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Outfit", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(142, 137, 122, 0.08)",
        node: "0 4px 18px 0 rgba(142, 137, 122, 0.05)",
      }
    },
  },
  plugins: [],
};
export default config;

