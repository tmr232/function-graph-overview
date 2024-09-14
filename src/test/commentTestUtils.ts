import type { Language } from "../control-flow/cfg";
import type { Requirements, TestFunction } from "./commentTestTypes";
/*
TODO: Write a script that collects all the test code and generates a webpage
      showing it.
      - Toggle to show only failing tests
      - The usual display toggles
      - Ability to show markers instead of node content
      - Shows the reason the test failed (in text!)
*/

export function parseComment(text: string): Requirements {
  const jsonContent = text
    .trim()
    .replaceAll(/^(?=\w)/gm, '"')
    .replaceAll(/:/gm, '":');
  return JSON.parse(`{${jsonContent}}`);
}

export interface TestFuncRecord {
  name: string;
  language: Language;
  reqs: Requirements;
  code: string;
}

export function intoRecords(testFuncs: TestFunction[]): TestFuncRecord[] {
  return [
    ...(function* () {
      for (const testFunc of testFuncs) {
        yield {
          name: testFunc.name,
          language: testFunc.language,
          code: testFunc.function.text,
          reqs: testFunc.reqs,
        };
      }
    })(),
  ];
}
