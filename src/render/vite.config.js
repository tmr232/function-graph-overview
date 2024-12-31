import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    copyPublicDir: true,
    outDir: "../../dist/demo/render",
    emptyOutDir: true,
  },
  base: "/function-graph-overview/render/",
});
