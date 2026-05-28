import { defineConfig } from "vite";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  server: {
    port: 5173,
    host: true,
    open: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
