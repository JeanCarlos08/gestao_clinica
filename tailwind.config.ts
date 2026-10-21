import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "#4DA768",
          bright: "#7BCF8A",
          deep: "#1E7A46",
          dark: "#155c33",
          darker: "#0d3a22",
        },
      },
      boxShadow: {
        "brand-glow": "0 0 32px rgba(77,167,104,0.18)",
        "brand-sm": "0 0 12px rgba(77,167,104,0.15)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-manrope)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
