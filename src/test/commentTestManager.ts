import {
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
}
