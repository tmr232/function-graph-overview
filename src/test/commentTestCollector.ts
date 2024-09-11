import { Glob } from "bun";
import { getTestFuncs as getTestFuncsForC } from "./collect-c";
import { getTestFuncs as getTestFuncsForGo } from "./collect-go";
import type { TestFunction } from "./commentTestTypes";

const testsDir = import.meta.dir + "/commentTestSamples";
const sampleGlob = new Glob("**/*.{go,c}");
const languages: {
  ext: string;
  getTestFuncs: (code: string) => Generator<TestFunction>;
}[] = [
  { ext: "c", getTestFuncs: getTestFuncsForC },
  { ext: "go", getTestFuncs: getTestFuncsForGo },
];

const extToFuncs = new Map(
  languages.map(({ ext, getTestFuncs: iterTestFuncs }) => [ext, iterTestFuncs]),
);

export async function collectTests(): Promise<TestFunction[]> {
  const allTestFuncs = [];
  for await (const file of sampleGlob.scan(testsDir)) {
    const ext = file.split(".").slice(-1)[0];
    const getTestFuncs = extToFuncs.get(ext);
    if (!getTestFuncs) continue;
    const code = await Bun.file(`${testsDir}/${file}`).text();
    const testFuncs = getTestFuncs(code);
    allTestFuncs.push(...testFuncs);
  }
  return allTestFuncs;
}
