import { remapNodeTargets } from "../control-flow/cfg-defs";
import { graphToDot } from "../control-flow/render";
import {
  buildSimpleCFG,
  requirementTests,
  type RequirementHandler,
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
        const reqHandler = requirementTests[key];
        if (!reqHandler) {
          continue;
        }
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
        const dot = graphToDot(cfg);
        return dot;
      };
      return [testName, handler];
    });
  }

  public get segmentationTests() {
    return this.testFunctions.map((testFunc) => {
      const testName = `${testFunc.language}: ${testFunc.name}: Segmentation`;
      const handler = () => {
        const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
        const offsetToNode = remapNodeTargets(cfg).offsetToNode;
        return offsetToNode;
      };
      return [testName, handler];
    });
  }
}
