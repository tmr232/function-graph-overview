import fs from "node:fs";
/**
 * Responsible for collecting all the comment-tests.
 *
 * @category Testing
 * @module
 */
import { glob } from "glob";
import { getTestFuncs as getTestFuncsForC } from "./collect-c";
import { getTestFuncs as getTestsForCpp } from "./collect-cpp.ts";
import { getTestFuncs as getTestFuncsForGo } from "./collect-go";
import { getTestFuncs as getTestsForPython } from "./collect-python";
import { getTestFuncs as getTestsForTSX } from "./collect-tsx";
import { getTestFuncs as getTestsForTypeScript } from "./collect-typescript";
import type { TestFunction } from "./commentTestTypes";

export const testsDir = `${import.meta.dirname}/commentTestSamples`;

const languages: {
  /**
   * File extension to map to the language
   */
  ext: string;
  /**
   * Returns all the tests in the code
   * @param code The source-code containing the tests
   */
  getTestFuncs: (code: string) => Generator<TestFunction>;
}[] = [
  // ADD-LANGUAGES-HERE
  { ext: "c", getTestFuncs: getTestFuncsForC },
  { ext: "go", getTestFuncs: getTestFuncsForGo },
  { ext: "py", getTestFuncs: getTestsForPython },
  { ext: "cpp", getTestFuncs: getTestsForCpp },
  { ext: "ts", getTestFuncs: getTestsForTypeScript },
  { ext: "tsx", getTestFuncs: getTestsForTSX },
];

const extToFuncs = new Map(
  languages.map(({ ext, getTestFuncs: iterTestFuncs }) => [ext, iterTestFuncs]),
);

function prefixFuncNames(
  testFuncs: TestFunction[],
  prefix: string,
): TestFunction[] {
  const newTestFuncs: TestFunction[] = [];
  for (const testFunc of testFuncs) {
    newTestFuncs.push({
      name: `${prefix}${testFunc.name}`,
      function: testFunc.function,
      reqs: testFunc.reqs,
      language: testFunc.language,
    });
  }
  return newTestFuncs;
}

const globPattern = `**/*.{${languages.map(({ ext }) => ext).join(",")},}`;

async function findSamples() {
  return await glob(globPattern, { cwd: testsDir });
}

export async function collectTests(): Promise<TestFunction[]> {
  const allTestFuncs = [];
  for await (const file of await findSamples()) {
    const ext = file.split(".").slice(-1)[0] as string;
    const getTestFuncs = extToFuncs.get(ext);
    if (!getTestFuncs) continue;
    let code = fs.readFileSync(`${testsDir}/${file}`).toString();
    // Make sure line-endings are consistent!
    code = code.replaceAll("\r", "");
    const testFuncs = getTestFuncs(code);
    allTestFuncs.push(...prefixFuncNames(Array.from(testFuncs), `${file}!`));
  }
  return allTestFuncs;
}
