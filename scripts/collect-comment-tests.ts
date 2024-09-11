import { testFunctions as testFuncsForGo } from "../src/test/collect-go";
import { testFunctions as testFuncsForC } from "../src/test/collect-c";
import { intoRecords } from "../src/test/commentTestUtils";
import { watch } from "fs";

const records = intoRecords([...testFuncsForC, ...testFuncsForGo]);

import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    watch: {
      type: "boolean",
      default: false,
    },
  },
  strict: true,
  allowPositionals: false,
});

if (!values.watch) {
  Bun.write("./dist/tests/commentTests.json", JSON.stringify(records));
} else {
  const watcher = watch("../src/test/samples", (event, filename) => {
    console.log(`Detected ${event} in ${filename}`);
  });

  process.on("SIGINT", () => {
    // close watcher when Ctrl-C is pressed
    console.log("Closing watcher...");
    watcher.close();

    process.exit(0);
  });
}
