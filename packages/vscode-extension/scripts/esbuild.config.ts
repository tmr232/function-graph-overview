import type { BuildOptions } from "esbuild";
// import { copy } from 'esbuild-plugin-copy';

const config: BuildOptions = {
  entryPoints: ["./src/vscode/extension.ts"],
  bundle: true,
  platform: "node",
  target: "node12",
  outdir: "./dist",
  outbase: "./src",
  outExtension: {
    ".js": ".cjs",
  },
  format: "cjs",
  external: ["vscode"],
  loader: {
    ".ts": "ts",
    ".js": "js",
    ".wasm": "file",
  },
  logLevel: "info",
  // plugins: [
  //   copy({
  //     resolveFrom: 'cwd',
  //     watch: true,
  //     verbose: true,
  //     assets: [
  //       {
  //         from: ['./parsers/*'],
  //         to: ['./dist/'],
  //       },
  //       {

  //         from: ["./media/*"],
  //         to: ["./dist/media/"],
  //       }
  //     ],
  //   }),
  // ]
};

export default config;
