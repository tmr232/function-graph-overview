import { test, expect } from "bun:test";
import {
  addRange,
  comparePoints,
  getValue,
  inplaceAddRange,
  newRanges,
} from "../control-flow/point-ranges";
import type { Point } from "web-tree-sitter";

function point(value: number): Point {
  return {
    row: value,
    column: value,
  };
}

test("Basic Range Test", () => {
  let ranges = newRanges("A");

  ranges = addRange(
    ranges,
    { row: 10, column: 10 },
    { row: 20, column: 20 },
    "B",
  );
  ranges = addRange(
    ranges,
    { row: 30, column: 30 },
    { row: 40, column: 40 },
    "C",
  );

  expect(ranges).toEqual([
    { start: { row: 0, column: 0 }, value: "A" },
    { start: { row: 10, column: 10 }, value: "B" },
    { start: { row: 20, column: 20 }, value: "A" },
    { start: { row: 30, column: 30 }, value: "C" },
    { start: { row: 40, column: 40 }, value: "A" },
  ]);
});

test("Add to 0", () => {
  const ranges = newRanges("A");
  inplaceAddRange(ranges, { row: 0, column: 0 }, { row: 20, column: 20 }, "B");

  expect(ranges).toEqual([
    { start: { row: 0, column: 0 }, value: "B" },
    { start: { row: 20, column: 20 }, value: "A" },
  ]);
});

test("Add to same start", () => {
  let ranges = newRanges("A");

  ranges = addRange(
    ranges,
    { row: 10, column: 10 },
    { row: 60, column: 60 },
    "B",
  );
  ranges = addRange(
    ranges,
    { row: 10, column: 10 },
    { row: 40, column: 40 },
    "C",
  );

  expect(ranges).toEqual([
    { start: { row: 0, column: 0 }, value: "A" },
    { start: { row: 10, column: 10 }, value: "C" },
    { start: { row: 40, column: 40 }, value: "B" },
    { start: { row: 60, column: 60 }, value: "A" },
  ]);
});

test("Invalid range addition", () => {
  const ranges = newRanges("A");

  inplaceAddRange(ranges, point(50), point(60), "B");
  expect(() => {
    inplaceAddRange(ranges, point(45), point(55), "C");
  }).toThrowError(/Cannot insert range at/);
});

test("Get Value", () => {
  let ranges = newRanges("A");

  ranges = addRange(ranges, point(10), point(20), "B");
  ranges = addRange(ranges, point(30), point(40), "C");

  expect(getValue(ranges, point(15))).toBe("B");
  expect(getValue(ranges, point(0))).toBe("A");
});

test("Compare points", () => {
  expect(comparePoints(point(0), point(0))).toBe(0);
  expect(comparePoints(point(10), point(0))).toBe(1);
  expect(comparePoints(point(0), point(10))).toBe(-1);
  expect(comparePoints(point(10), point(0))).toBeGreaterThanOrEqual(0);
});
