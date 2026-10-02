import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["@thaunknown/simple-peer"],
  },
  server: {
    proxy: {
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
      },
    },
  },
});