import Bun from 'bun';

Bun.build({
    entrypoints: ["./src/extension.ts"],
    outdir: "./dist",
});