import { collectTests } from "../src/test/commentTestCollector";
import { buildSimpleCFG } from "../src/test/commentTestHandlers";
import { graphToDot } from "../src/control-flow/render";
import type { TestFunction } from "../src/test/commentTestTypes";

export const dotSnapshotPath = "./src/test/__snapshots__/dotSnapshots.json";

export async function loadDOTSnapshots(): Promise<Record<string, string>> {
  const snapshotFile = Bun.file(dotSnapshotPath);
  return JSON.parse(await snapshotFile.text())
}

export function formatSnapshotName(testFunc: TestFunction): string {
  return `${testFunc.language}: ${testFunc.name}`
}

async function generateSnapshots() {
  const tests = await collectTests();
  const snapshots: Record<string, string> = {};
  for (const testFunc of tests) {
    const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
    const dot = graphToDot(cfg);
    snapshots[formatSnapshotName(testFunc)] = dot;
  }
  await Bun.write(
    dotSnapshotPath,
    JSON.stringify(snapshots),
  );
}

async function main() {
  generateSnapshots();
}

await main();
