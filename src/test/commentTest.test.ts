import { test, expect } from "bun:test";
import { TestManager } from "./commentTestManager";
import { collectTests } from "./commentTestCollector";

const testManager = new TestManager({
  testFunctions: await collectTests(),
});

test.each(testManager.allTests)(
  testManager.nameFormat,
  // @ts-expect-error: Mismatch between function types
  testManager.invokeWith((failure: string) => expect().fail(failure)),
);
