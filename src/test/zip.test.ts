import { pairwise, structZip, zip } from "../control-flow/zip";
import { test, expect } from "bun:test";

test("zip", () => {
  expect([...zip([1, 2, 3], ["a", "b", "c"])]).toEqual([
    [1, "a"],
    [2, "b"],
    [3, "c"],
  ]);
});

test("structZip", () => {
  expect([...structZip({ n: [1, 2, 3], s: ["a", "b", "c"] })]).toEqual([
    {
      n: 1,
      s: "a",
    },
    {
      n: 2,
      s: "b",
    },
    {
      n: 3,
      s: "c",
    },
  ]);
});

test("pairwise", () => {
  expect([...pairwise([1, 2, 3, 4])]).toEqual([
    [1, 2],
    [2, 3],
    [3, 4],
  ]);
});
