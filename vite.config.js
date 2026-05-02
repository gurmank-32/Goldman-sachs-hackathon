import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const FLASK_PORT = process.env.FLASK_PORT || "5020";

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind IPv4 explicitly so `http://localhost:5173/` (often `127.0.0.1`) hits this app,
    // not another Vite that was only listening on `[::1]:5173`.
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${FLASK_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
