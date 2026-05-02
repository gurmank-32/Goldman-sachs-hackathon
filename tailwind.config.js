/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        marcus: {
          navy: "#0A1628",
          card: "#1C2B47",
          blue: "#6DB6FF",
          green: "#00C48C",
          red: "#FF6B6B",
          ink: "#1A1A2E",
        },
      },
    },
  },
  plugins: [],
};
