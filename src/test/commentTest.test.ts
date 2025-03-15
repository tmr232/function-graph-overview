import { expect, test, describe ,beforeAll, it} from "vitest";
import { collectTests } from "./commentTestCollector";
import { TestManager } from "./commentTestManager";
import { Language, Parser } from "web-tree-sitter";
import treeSitterC from "../../parsers/tree-sitter-c.wasm?url";

let C;
describe("bla", () =>{
beforeAll(async () => {
  ({C} = await Parser.init().then(async () => ({
    C: await Language.load(treeSitterC),
  })));
})
  it("should ", () => {
    console.log(C);

  });
})

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
