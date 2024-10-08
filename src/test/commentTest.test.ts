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

test.each(testManager.snapshotTests)(
  testManager.nameFormat,
  (_name, handler) => {
    // @ts-expect-error: Mismatch between function types
    const dot = handler();
    expect(dot).toMatchSnapshot();
  },
);

test.each(testManager.segmentationTests)(
  testManager.nameFormat,
  (_name, handler) => {
    // @ts-expect-error: Mismatch between function types
    const offsetToNode = handler();
    expect(offsetToNode).toMatchSnapshot();
  },
);
