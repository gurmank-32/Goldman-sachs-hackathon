/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      colors: {
        marcus: {
          navy: "#0A1628",
          navySecondary: "#112240",
          gold: "#B8962E",
          goldHover: "#9A7A22",
          goldLight: "#F5EDD6",
          success: "#1A7F5A",
          warning: "#B45309",
          danger: "#9B1C1C",
          bg: "#F9F8F6",
          card: "#FFFFFF",
          ink: "#0A1628",
          muted: "#718096",
          secondary: "#4A5568",
          border: "#E8E4DC",
          /** @deprecated prefer gold — kept for gradual migration */
          blue: "#B8962E",
          green: "#1A7F5A",
          red: "#9B1C1C",
        },
      },
    },
  },
  plugins: [],
};
