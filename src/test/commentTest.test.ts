import { test } from "bun:test";
import { TestManager } from "./commentTestUtils";
import { testFunctions as testFuncsForGo } from "./collect-go";
import { testFunctions as testFuncsForC } from "./collect-c";

const testManager = new TestManager({
  testFunctions: [...testFuncsForC, ...testFuncsForGo],
});

test.each(testManager.allTests)(testManager.nameFormat, testManager.invoke);
