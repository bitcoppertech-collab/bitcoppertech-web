/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
        display: ["Bebas Neue", "sans-serif"],
      },
      colors: {
        ore: { DEFAULT: "#C17F3A", light: "#E8A855" },
        steel: { DEFAULT: "#1C2B3A", dark: "#0D1820" },
      },
    },
  },
  plugins: [],
};
