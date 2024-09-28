import { type TestReport, type TestResults } from "../src/test/reporting";
import { collectTests } from "../src/test/commentTestCollector";
import type { TestFunction } from "../src/test/commentTestTypes";
import {
  buildSimpleCFG,
  requirementTests,
} from "../src/test/commentTestHandlers";
import { graphToDot } from "../src/control-flow/render";
import { formatSnapshotName, loadDOTSnapshots } from "./dot-snapshots.lib";
import { Graphviz } from "@hpcc-js/wasm-graphviz";

const watchDir = import.meta.dir + "/../src";
const graphviz = await Graphviz.load();

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

export async function generateReport(
  tests: TestFunction[],
): Promise<TestReport[]> {
  const testReports: TestReport[] = [];
  const dotSnapshots = await loadDOTSnapshots();
  for (const testFunc of tests) {
    const results = runTestsFor(testFunc);
    const dot = {
      current: generateDOTFor(testFunc),
      snapshot: dotSnapshots[formatSnapshotName(testFunc)] as string,
    };
    const svg = {
      current: graphviz.dot(dot.current),
      snapshot: graphviz.dot(dot.snapshot),
    };
    const failed =
      results.some((result) => result.failure) || dot.current !== dot.snapshot;
    const name = formatSnapshotName(testFunc);
    const code = testFunc.function.text;
    testReports.push({ dot, results, failed, name, code, svg });
  }
  return testReports;
}

async function writeReport() {
  const report = await generateReport(await collectTests());
  await Bun.write("./dist/tests/testReport.json", JSON.stringify(report));
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
}

await main();
