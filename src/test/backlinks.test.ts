import { expect, test } from "bun:test";
import { MultiDirectedGraph } from "graphology";
import { mergePath } from "graphology-utils";
import { detectBacklinks } from "../control-flow/graph-ops";

const testCases: [string, string[][], { from: string; to: string }[]][] = [
  ["a", [["a", "b", "c", "d", "b"]], [{ from: "d", to: "b" }]],
  ["a", [["a", "b", "c", "d"]], []],
  [
    "a",
    [
      ["a", "b", "c", "d", "a"],
      ["b", "a"],
    ],
    [
      { from: "d", to: "a" },
      { from: "b", to: "a" },
    ],
  ],
  ["a", [["a", "a"]], [{ from: "a", to: "a" }]],
];

function numberedTests<T>(prefix: string, testCases: T[]): [string, T][] {
  const namedCases = testCases.map((testCase, index) => {
    return [`${prefix}-${index}`, testCase] satisfies [string, T];
  });
  return namedCases;
}

function compare<T>(a: T, b: T): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

test.each(numberedTests("detect-backlinks", testCases))(
  "%s",
  (name, testCase) => {
    const graph = new MultiDirectedGraph();
    const [entry, paths, backlinks] = testCase;
    for (const path of paths) {
      mergePath(graph, path);
    }
    expect(detectBacklinks(graph, entry)).toEqual(
      backlinks.toSorted((a, b) => compare(a.from, b.from)),
    );
  },
);
