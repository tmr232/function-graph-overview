import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/cfg.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

const namesFrom = (code: string) =>
  [...iterFunctions(code, "Python")].map((f) =>
    extractFunctionName("Python", f),
  );

describe("Python: function definitions", () => {
  test.each([
    [
      "simple top-level function definitions",
      `
      def foo(): pass
      def bar(x): return x
      def _private(): pass
      `,
      ["foo", "bar", "_private"],
    ],
    [
      "nested functions with callbacks and returns",
      `
      def outer():
          def inner():
              def deep():
                  pass
              return deep
          def cb(): pass
          run(cb)
          return inner
      `,
      ["outer", "inner", "deep", "cb"],
    ],
    [
      "async function and generator function",
      `
      async def a(): pass
      def gen():
          yield 1
      `,
      ["a", "gen"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("Python: classes and methods", () => {
  test.each([
    [
      "methods of various types",
      `
      class C:
          def __init__(self): pass
          def m(self): pass
          @staticmethod
          def s(): pass
          @classmethod
          def c(cls): pass
          async def a(self): pass
      `,
      ["__init__", "m", "s", "c", "a"],
    ],
    [
      "nested classes with methods",
      `
      class Outer:
          def m(self): pass
          class Inner:
              def n(self): pass
      `,
      ["m", "n"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});
