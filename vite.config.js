import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const FLASK_PORT = process.env.FLASK_PORT || "5020";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${FLASK_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
