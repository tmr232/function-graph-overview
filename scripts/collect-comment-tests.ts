import { watch } from "fs";
import { parseArgs } from "util";
import { collectTests } from "../src/test/commentTestCollector";
import type { TestFunction } from "../src/test/commentTestTypes";
import { buildSimpleCFG, requirementTests } from "../src/test/commentTestHandlers";
import { graphToDot } from "../src/control-flow/render";
import { formatSnapshotName, loadDOTSnapshots } from "./generate-dot-snapshots";

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

export interface TestResults {
  reqName: string;
  reqValue: unknown;
  failure: string | null;
}

function runTestsFor(testFunc: TestFunction): TestResults[] {
  const testResults: TestResults[] = [];
  for (const [key, value] of Object.entries(testFunc.reqs)) {
    const reqHandler = requirementTests[key];
    if (!reqHandler) {
      continue;
    }
    testResults.push({
      reqName: key,
      reqValue: value,
      failure: reqHandler(testFunc),
    });
  }
  return testResults;
}

function generateDOTFor(testFunc: TestFunction): string {
  const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
  const dot = graphToDot(cfg);
  return dot;
}

type TestReport = {
  name: string,
  failed: boolean,
  dot: { snapshot: string, current: string },
  results: TestResults[],
}

async function generateReport() {
  const testReports: TestReport[] = [];
  const dotSnapshots = await loadDOTSnapshots();
  const tests = await collectTests();
  for (const testFunc of tests) {
    const results = runTestsFor(testFunc);
    const dot = {
      current: generateDOTFor(testFunc),
      snapshot: dotSnapshots[formatSnapshotName(testFunc)] as string
    };
    const failed = results.some(result => result.failure);
    const name = `${testFunc.language}: ${testFunc.name}`
    testReports.push({ dot, results, failed, name })
  }
  Bun.write("./dist/tests/testReport.json", JSON.stringify(testReports));
}

async function logAndContinue(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.trace(error);
  }
}

async function main() {
  await logAndContinue(generateReport);
  if (values.watch) {
    const watcher = watch(
      watchDir,
      { recursive: true },
      async (event, filename) => {
        console.log(`${event}: ${filename}, regenerating commentTests.json`);
        await logAndContinue(generateReport);
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