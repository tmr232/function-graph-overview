import { test, expect } from "bun:test";
import { testFunctions as testFuncsForGo } from "./collect-go";
import { testFunctions as testFuncsForC } from "./collect-c";
import { TestManager } from "./commentTestManager";

const testManager = new TestManager({
  testFunctions: [...testFuncsForC, ...testFuncsForGo],
});

test.each(testManager.allTests)(
  testManager.nameFormat,
  // @ts-expect-error: Mismatch between function types
  testManager.invokeWith((failure: string) => expect().fail(failure)),
);
