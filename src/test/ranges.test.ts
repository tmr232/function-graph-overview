import { expect, test } from "bun:test";
import {
  addRange,
  getValue,
  inplaceAddRange,
  newRanges,
} from "../control-flow/ranges";

test("Basic Range Test", () => {
  let ranges = newRanges("A");

  ranges = addRange(ranges, 10, 20, "B");
  ranges = addRange(ranges, 30, 40, "C");

  expect(ranges).toEqual([
    { start: 0, value: "A" },
    { start: 10, value: "B" },
    { start: 20, value: "A" },
    { start: 30, value: "C" },
    { start: 40, value: "A" },
  ]);
});

test("Add to 0", () => {
  const ranges = newRanges("A");
  inplaceAddRange(ranges, 0, 20, "B");

  expect(ranges).toEqual([
    { start: 0, value: "B" },
    { start: 20, value: "A" },
  ]);
});

test("Add to same start", () => {
  let ranges = newRanges("A");

  ranges = addRange(ranges, 10, 60, "B");
  ranges = addRange(ranges, 10, 40, "C");

  expect(ranges).toEqual([
    { start: 0, value: "A" },
    { start: 10, value: "C" },
    { start: 40, value: "B" },
    { start: 60, value: "A" },
  ]);
});

test("Invalid range addition", () => {
  const ranges = newRanges("A");

  inplaceAddRange(ranges, 50, 60, "B");
  expect(() => {
    inplaceAddRange(ranges, 45, 55, "C");
  }).toThrowError(/Cannot insert range at/);
});

test("Get Value", () => {
  let ranges = newRanges("A");

  ranges = addRange(ranges, 10, 20, "B");
  ranges = addRange(ranges, 30, 40, "C");

  expect(getValue(ranges, 15)).toBe("B");
  expect(getValue(ranges, 0)).toBe("A");
});
