import { expect, test } from "bun:test";
import { Range } from "../control-flow/ranges";

test("Basic Range Test", () => {
  const range = new Range("A");

  range.add(10, 20, "B");
  range.add(30, 40, "C");

  expect(range.get(0)).toBe("A");
  expect(range.get(10)).toBe("B");
  expect(range.get(20)).toBe("A");
  expect(range.get(30)).toBe("C");
  expect(range.get(40)).toBe("A");
});

test("Add to 0", () => {
  const range = new Range("A");
  range.add(0, 20, "B");

  expect(range.get(0)).toBe("B");
  expect(range.get(20)).toBe("A");
});

test("Add to same start", () => {
  const range = new Range("A");

  range.add(10, 60, "B");
  range.add(10, 40, "C");

  expect(range.get(0)).toBe("A");
  expect(range.get(10)).toBe("C");
  expect(range.get(40)).toBe("B");
  expect(range.get(60)).toBe("A");
});

test("Invalid range addition", () => {
  const range = new Range("A");

  range.add(50, 60, "B");
  expect(() => {
    range.add(45, 55, "C");
  }).toThrowError(/Cannot insert range at/);
});
