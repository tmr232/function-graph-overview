import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

/**
 * Helpers
 */
const namesFrom = (code: string) =>
  [...iterFunctions(code, "Go")].map((f) =>
    extractFunctionName(f, "Go"),
  );
/* ================================
   BASIC FUNCTIONS
================================ */
describe("Go: basic functions", () => {
  test("named top-level functions", () => {
    const code = `
      package main
      func Add(a int, b int) int { return a + b }
      func greet(name string) string { return "Hello " + name }
    `;
    expect(namesFrom(code)).toEqual(["Add", "greet"]);
  });

  test("anonymous functions assigned to variables", () => {
    const code = `
      package main
      func main() {
        x := func(a int) int { return a * 2 }
        y := func() {}
        _ = x; _ = y
      }
    `;
    expect(namesFrom(code)).toEqual(["main", "x", "y"]);
  });
});

/* ================================
   METHODS AND STRUCTS
================================ */
describe("Go: methods and interfaces", () => {
  test("methods with receivers", () => {
    const code = `
      package main
      type Point struct { X, Y int }
      func (p Point) Move(dx int, dy int) { p.X += dx; p.Y += dy }
      func (p *Point) Reset() { p.X = 0; p.Y = 0 }
    `;
    expect(namesFrom(code)).toEqual(["Move", "Reset"]);
  });
});

/* ================================
   SPECIAL CONTEXTS
================================ */
describe("Go: special contexts", () => {
  test("function returning another function", () => {
    const code = `
      package main
      func makeAdder(base int) func(int) int {
        return func(x int) int { return base + x }
      }
    `;
    expect(namesFrom(code)).toEqual(["makeAdder"]);
  });

  test("functions in composite literals", () => {
    const code = `
      package main
      var handlers = []func(int){
        func(x int) {},
        func(y int) {},
      }
    `;
    expect(namesFrom(code)).toEqual(["<anonymous>", "<anonymous>"]);
  });

  test("functions used as parameters", () => {
    const code = `
      package main
      func do(f func(int) int) int { return f(5) }
      func square(x int) int { return x * x }
      func main() { do(square) }
    `;
    expect(namesFrom(code)).toEqual(["do", "square", "main"]);
  });
});

/* ================================
   MULTIPLE ASSIGNMENTS
================================ */
describe("Go: multiple func assignments", () => {
  test("two anonymous functions assigned together", () => {
    const code = `
      package main
      func main() {
        var x, y = func() {}, func() {}
        _ = x; _ = y
      }
    `;
    expect(namesFrom(code)).toEqual(["main", "x", "y"]);
  });

  test("mix declared function + anonymous func", () => {
    const code = `
      package main
      func Declared() {}
      func main() {
        x, y := Declared, func() {}
        _ = x; _ = y
      }
    `;
    expect(namesFrom(code)).toEqual(["Declared", "main", "y"]);
  });
});

/* ================================
   NESTED AND EDGE CASES
================================ */
describe("Go: nested and edge cases", () => {
  test("nested short var", () => {
    const code = `
    func main() {
      var x = func() {
        y := func() {}
        y()
      }
      x()
    }`;
    const funcIterator = iterFunctions(code, "Go");
    const foundNames = [...funcIterator].map((func) =>
      extractFunctionName(func, "Go"),
    );
    const expectedNames = ["main", "x", "y"];
    expect(foundNames).toContainEqual(expectedNames);
  });
});
