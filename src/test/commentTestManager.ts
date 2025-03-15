import { remapNodeTargets } from "../control-flow/cfg-defs";
import { graphToDot } from "../control-flow/render";
import {
  type RequirementHandler,
  buildSimpleCFG,
  requirementTests,
} from "./commentTestHandlers";
import type { TestFunction } from "./commentTestTypes";

interface TestManagerOptions {
  testFunctions: TestFunction[];
}
export class TestManager {
  private readonly testFunctions: TestFunction[];
  public readonly nameFormat = "%s";

  constructor(options: TestManagerOptions) {
    this.testFunctions = options.testFunctions;
    console.log(this.testFunctions)
  }

  public invokeWith(failureCallback: (failure: string) => void) {
    return (
      _name: string,
      testFunc: TestFunction,
      reqHandler: RequirementHandler,
    ) => {
      const failure: null | string = reqHandler(testFunc);
      if (failure) {
        failureCallback(failure);
      }
    };
  }

  public get allTests() {
    const tests = [];
    for (const testFunc of this.testFunctions) {
      for (const [key, _value] of Object.entries(testFunc.reqs)) {
        const testName = `${testFunc.language}: ${testFunc.name}: ${key}`;
        if (!Object.keys(requirementTests).includes(key)) {
          throw new Error(
            `Invalid comment-test type "${key}" in "${testName}"`,
          );
        }
        const reqHandler = requirementTests[key as keyof typeof testFunc.reqs];
        tests.push([testName, testFunc, reqHandler]);
      }
    }
    return tests;
  }

  public get snapshotTests() {
    return this.testFunctions.map((testFunc) => {
      const testName = `${testFunc.language}: ${testFunc.name}: DOT Snapshot`;
      const handler = () => {
        const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
        return graphToDot(cfg);
      };
      return [testName, handler];
    });
  }

  public get segmentationTests() {
    return this.testFunctions.map((testFunc) => {
      const testName = `${testFunc.language}: ${testFunc.name}: Segmentation`;
      const handler = () => {
        const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
        return remapNodeTargets(cfg).offsetToNode;
      };
      return [testName, handler];
    });
  }
}
