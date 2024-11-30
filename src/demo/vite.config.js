import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    copyPublicDir: true,
    emptyOutDir: true,
  },
  base: "/function-graph-overview/",
});
