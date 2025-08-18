import { describe, expect, test } from "vitest";
import { iterFunctions } from "../file-parsing/bun.ts";
import { extractFunctionName } from "../control-flow/function-utils.ts";

/**
 * Helpers
 */
const namesFrom = (code: string) =>
  [...iterFunctions(code, "Python")].map(f =>
    extractFunctionName(f, "Python"),
  );

/* ================================
   BASIC & NESTED DEFINITIONS
================================ */
describe("Python: function definitions", () => {
  test("basic and nested functions", () => {
    const code = `
def foo(): pass
def bar(x): return x
def _private(): pass

def outer():
    def inner():
        def deep():
            pass
        return deep
    def cb(): pass
    run(cb)
    return inner
    `;
    expect(namesFrom(code)).toEqual([
      "foo",
      "bar",
      "_private",
      "outer",
      "inner",
      "deep",
      "cb",
    ]);
  });

  test("async and generator functions", () => {
    const code = `
async def a(): pass
def gen():
    yield 1
    `;
    expect(namesFrom(code)).toEqual(["a", "gen"]);
  });
});

/* ================================
   CLASSES & METHODS
================================ */
describe("Python: classes and methods", () => {
  test("methods of various types", () => {
    const code = `
class C:
    def __init__(self): pass
    def m(self): pass
    @staticmethod
    def s(): pass
    @classmethod
    def c(cls): pass
    async def a(self): pass
    `;
    expect(namesFrom(code)).toEqual([
      "__init__",
      "m",
      "s",
      "c",
      "a",
    ]);
  });

  test("nested classes", () => {
    const code = `
class Outer:
    def m(self): pass
    class Inner:
        def n(self): pass
    `;
    expect(namesFrom(code)).toEqual(["m", "n"]);
  });
});

/* ================================
   SPECIAL CONTEXTS
================================ */
describe("Python: special contexts", () => {
  test("decorated functions", () => {
    const code = `
def dec(fn): return fn

@dec
def decorated(): pass
    `;
    expect(namesFrom(code)).toEqual(["dec", "decorated"]);
  });

  test("function inside comprehension", () => {
    const code = `
def outer():
    def helper(): return 1
    results = [helper() for n in range(5)]
    return results
    `;
    expect(namesFrom(code)).toEqual(["outer", "helper"]);
  });
});

