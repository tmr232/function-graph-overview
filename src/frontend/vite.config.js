import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
// import { wasm } from '@rollup/plugin-wasm';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()
  ]
  ,
  // optimizeDeps: {
  //   exclude: ['*.wasm']
  // },
  // assetsInclude: ['*.wasm']
})
