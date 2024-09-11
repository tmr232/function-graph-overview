import { intoRecords } from "../src/test/commentTestUtils";
import { watch } from "fs";
import { parseArgs } from "util";
import { collectTests, testsDir } from "../src/test/commentTestCollector";

const watchDir = `${testsDir}/../`;

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

async function generateJson() {

    const records = intoRecords(await collectTests());
    Bun.write("./dist/tests/commentTests.json", JSON.stringify(records));
}

generateJson();
if (values.watch) {
    const watcher = watch(watchDir, async (event, filename) => {
        console.log(`${event}: ${filename}, regenerating commentTests.json`);
        await generateJson();
    });

    process.on("SIGINT", () => {
        // close watcher when Ctrl-C is pressed
        console.log("Closing watcher...");
        watcher.close();

        process.exit(0);
    });
}
