import { watch } from "fs";
import { parseArgs } from "util";
import { generateReport } from "../src/test/reporting";

const watchDir = import.meta.dir + "/../src";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    watch: {
      type: "boolean",
      default: false,
    },
  },
  strict: true,
  allowPositionals: true,
});

async function writeReport() {
  const report = await generateReport();
  Bun.write("./dist/tests/testReport.json", JSON.stringify(report));
}

async function logAndContinue(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.trace(error);
  }
}

async function main() {
  await logAndContinue(writeReport);
  if (values.watch) {
    const watcher = watch(
      watchDir,
      { recursive: true },
      async (event, filename) => {
        console.log(`${event}: ${filename}, regenerating commentTests.json`);
        await logAndContinue(writeReport);
      },
    );

    process.on("SIGINT", () => {
      // close watcher when Ctrl-C is pressed
      console.log("Closing watcher...");
      watcher.close();

      process.exit(0);
    });
  }
}

await main();