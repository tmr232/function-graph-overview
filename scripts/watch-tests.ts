import { watch } from "fs";
import { $ } from "bun";

const watchDir = import.meta.dir + "/../src";

async function generateTestReports() {
  try {
    await $`bun run ./scripts/collect-comment-tests.ts`;
  } catch (error) {
    console.log(error);
  }
}

async function main() {
  await generateTestReports();
  const watcher = watch(
    watchDir,
    { recursive: true },
    async (event, filename) => {
      console.log(`${event}: ${filename}, regenerating commentTests.json`);
      await generateTestReports();
    },
  );

  process.on("SIGINT", () => {
    // close watcher when Ctrl-C is pressed
    console.log("Closing watcher...");
    watcher.close();

    process.exit(0);
  });
}

await main();
