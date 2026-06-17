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
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
          game: ["./src/scenes/GameScene", "./src/network/RemotePlayerManager"],
        },
      },
    },
  },
});
