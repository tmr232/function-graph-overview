import esbuild from "esbuild";
import config from "./esbuild.config";

try {
  const context = await esbuild.context(config);
  await context.watch();
} catch (_e) {
  process.exit(1);
}
