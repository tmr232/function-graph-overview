import { collectTests } from "../src/test/commentTestCollector";
import { buildSimpleCFG } from "../src/test/commentTestHandlers";
import { graphToDot } from "../src/control-flow/render";

async function generateSnapshots() {
  const tests = await collectTests();
  const snapshots: Record<string, string> = {};
  for (const testFunc of tests) {
    const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
    const dot = graphToDot(cfg);
    snapshots[`${testFunc.language}: ${testFunc.name}`] = dot;
  }
  await Bun.write(
    "./src/test/__snapshots__/dotSnapshots.json",
    JSON.stringify(snapshots),
  );
}

async function main() {
  generateSnapshots();
}

await main();
