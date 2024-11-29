import { Glob } from "bun";
import { getTestFuncs as getTestFuncsForC } from "./collect-c";
import { getTestFuncs as getTestFuncsForGo } from "./collect-go";
import { getTestFuncs as getTestsForPython } from "./collect-python";
import {getTestFuncs as getTestsForCpp} from "./collect-cpp.ts";
import type { TestFunction } from "./commentTestTypes";

export const testsDir = import.meta.dir + "/commentTestSamples";
const languages: {
  ext: string;
  getTestFuncs: (code: string) => Generator<TestFunction>;
}[] = [
  { ext: "c", getTestFuncs: getTestFuncsForC },
  { ext: "go", getTestFuncs: getTestFuncsForGo },
  { ext: "py", getTestFuncs: getTestsForPython },
  { ext: "cpp", getTestFuncs:getTestsForCpp}
];

const sampleGlob = new Glob(
  `**/*.{${languages.map(({ ext }) => ext).join(",")}}`,
);

const extToFuncs = new Map(
  languages.map(({ ext, getTestFuncs: iterTestFuncs }) => [ext, iterTestFuncs]),
);

export async function collectTests(): Promise<TestFunction[]> {
  const allTestFuncs = [];
  for await (const file of sampleGlob.scan(testsDir)) {
    const ext = file.split(".").slice(-1)[0] as string;
    const getTestFuncs = extToFuncs.get(ext);
    if (!getTestFuncs) continue;
    let code = await Bun.file(`${testsDir}/${file}`).text();
    // Make sure line-endings are consistent!
    code = code.replaceAll("\r", "");
    const testFuncs = getTestFuncs(code);
    allTestFuncs.push(...testFuncs);
  }
  return allTestFuncs;
}
