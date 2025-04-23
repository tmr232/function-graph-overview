import { expect, test } from "vitest";
import { matchWildcard } from "../control-flow/wildcard.ts";

test("Exact match", () => {
  expect(matchWildcard("a", "a")).toBe(true);
  expect(matchWildcard("a", "b")).toBe(false);
  expect(matchWildcard("a", "aa")).toBe(false);
  expect(matchWildcard("a", "ab")).toBe(false);
  expect(matchWildcard("a", "ba")).toBe(false);
  expect(matchWildcard("a", "")).toBe(false);
});

test("Begins with", () => {
  expect(matchWildcard("a*", "a")).toBe(true);
  expect(matchWildcard("a*", "abcd")).toBe(true);
  expect(matchWildcard("a*", "b")).toBe(false);
  expect(matchWildcard("a*", "ba")).toBe(false);
});

test("Ends with", () => {
  expect(matchWildcard("*a", "a")).toBe(true);
  expect(matchWildcard("*a", "dcba")).toBe(true);
  expect(matchWildcard("*a", "b")).toBe(false);
  expect(matchWildcard("*a", "ab")).toBe(false);
});

test("Starts and ends with", () => {
  expect(matchWildcard("a*b", "ab")).toBe(true);
  expect(matchWildcard("a*b", "axxxxxxb")).toBe(true);
  expect(matchWildcard("a*b", "axxxxxxbx")).toBe(false);
  expect(matchWildcard("a*b", "xaxxxxxxb")).toBe(false);
});

test("Contains", () => {
  expect(matchWildcard("*a*", "a")).toBe(true);
  expect(matchWildcard("*a*", "xa")).toBe(true);
  expect(matchWildcard("*a*", "ax")).toBe(true);
  expect(matchWildcard("*a*", "xax")).toBe(true);
  expect(matchWildcard("*a*", "xx")).toBe(false);
});
