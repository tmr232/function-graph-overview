import { test } from "bun:test";
import { testFunctions as testFuncsForGo } from "./collect-go";
import { testFunctions as testFuncsForC } from "./collect-c";
import { TestManager } from "./commentTestManager";
const testManager = new TestManager({
  testFunctions: [...testFuncsForC, ...testFuncsForGo],
});

test.each(testManager.allTests)(testManager.nameFormat, testManager.invoke);
