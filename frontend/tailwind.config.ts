import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Space Grotesk'", ...defaultTheme.fontFamily.sans]
      },
      colors: {
        primary: {
          DEFAULT: "#4F46E5",
          dark: "#312E81"
        },
        board: {
          light: "#F0D9B5",
          dark: "#B58863"
        }
      },
      boxShadow: {
        glow: "0 10px 50px rgba(79,70,229,0.25)"
      }
    }
  },
  plugins: []
};

export default config;
