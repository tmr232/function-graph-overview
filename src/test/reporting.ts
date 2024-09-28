import { formatSnapshotName, loadDOTSnapshots } from "../../scripts/generate-dot-snapshots";
import { graphToDot } from "../control-flow/render";
import { collectTests } from "./commentTestCollector";
import { buildSimpleCFG, requirementTests } from "./commentTestHandlers";
import type { TestFunction } from "./commentTestTypes";

export interface TestResults {
    reqName: string;
    reqValue: unknown;
    failure: string | null;
}
export type TestReport = {
    name: string,
    failed: boolean,
    dot: { snapshot: string, current: string },
    results: TestResults[],
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



export async function generateReport(): Promise<TestReport[]> {
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
    return testReports;
}
