import type { Config } from "tailwindcss";
// @ts-expect-error - no types
import nativewind from "nativewind/preset";

import baseConfig from "@acme/tailwind-config/native";

const colors = require("./src/components/ui/colors");

/** @type {import('tailwindcss').Config} */
export default {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [nativewind, baseConfig],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter"],
      },
      spacing: {
        global: "16px",
      },
      colors: {
        // Light theme colors
        ...colors,
        highlight: "#0EA5E9",
        light: {
          primary: "#ffffff", // White
          secondary: "#E2E8F0", // Light gray
          text: "#000000", // Black
          subtext: "#64748B",
        },
        // Dark theme colors
        dark: {
          primary: "#0A0A0A", // Black
          secondary: "#171717",
          darker: "#000000",
          text: "#ffffff", // White
          subtext: "#A1A1A1",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
