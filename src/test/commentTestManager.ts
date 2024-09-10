import { requirementTests } from "./commentTestHandlers";
import type { TestFunction } from "./commentTestTypes";
import { expect } from "bun:test";

interface TestManagerOptions {
  testFunctions: TestFunction[];
}
export class TestManager {
  private readonly testFunctions: TestFunction[];
  private readonly testMap: Map<string, TestFunction>;
  public readonly nameFormat = "%s";
  // @ts-expect-error: Implicit any type
  public readonly invoke = (_name, testFunc, reqHandler) => {
    const failure: null | string = reqHandler(testFunc);
    if (failure) {
      expect().fail(failure);
    } else {
      expect().pass();
    }
  };

  constructor(options: TestManagerOptions) {
    this.testFunctions = options.testFunctions;
    this.testMap = new Map(
      this.testFunctions.map((testFunc) => [testFunc.name, testFunc]),
    );
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
