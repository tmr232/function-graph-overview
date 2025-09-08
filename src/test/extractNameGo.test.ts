import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/cfg.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

const namesFrom = (code: string) =>
  [...iterFunctions(code, "Go")].map((f) => extractFunctionName("Go", f));

describe("Go: basic functions", () => {
  test("named top-level functions", () => {
    const code = `
      func Add(a int, b int) int { return a + b }
      func greet(name string) string { return "Hello " + name }
    `;
    expect(namesFrom(code)).toEqual(["Add", "greet"]);
  });
});

describe("Go: methods with receivers", () => {
  test("value and pointer receivers", () => {
    const code = `
      type Point struct { X, Y int }
      func (p Point) Move(dx int, dy int) { p.X += dx; p.Y += dy }
      func (p *Point) Reset() { p.X = 0; p.Y = 0 }
    `;
    expect(namesFrom(code)).toEqual(["Move", "Reset"]);
  });
});

describe("Go: special & nested contexts", () => {
  test.each([
    [
      "function returning another function",
      `
      func makeAdder(base int) func(int) int {
        return func(x int) int { return base + x }
      }
      `,
      ["makeAdder", undefined],
    ],
    [
      "functions in composite literals",
      `
      var handlers = []func(int){
        func(x int) {},
        func(y int) {},
      }
      `,
      [undefined, undefined],
    ],
    [
      "nested short var",
      `
      func main() {
        var x = func() {
          y := func() {}
          y()
        }
        x()
      }
      `,
      ["main", "x", "y"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("Go: assignments & invocation forms", () => {
  test.each([
    [
      "short var declaration (:=) with two func literals",
      `
      func main() {
        x := func(a int) int { return a * 2 }
        y := func() {}
        _ = x; _ = y
      }
      `,
      ["main", "x", "y"],
    ],
    [
      "multi-var with two func literals",
      `
      func main() {
        var x, y = func() {}, func() {}
        _ = x; _ = y
      }
      `,
      ["main", "x", "y"],
    ],
    [
      "multi-var with one func literal (prefer first name)",
      `
      func main() {
        var a, b = func() {}
        _ = a; _ = b
      }
      `,
      ["main", "a"],
    ],
    [
      "var spec with explicit type + init",
      `
      func main() {
        var f func() = func() {}
        _ = f
      }
      `,
      ["main", "f"],
    ],
    [
      "selector on LHS assignment",
      `
      type S struct{ fn func() }
      func main() {
        var s S
        s.fn = func() {}
        _ = s
      }
      `,
      ["main", "s.fn"],
    ],
    [
      "go/defer with func literals (anonymous)",
      `
      func main() {
        go func() {}()
        defer func() {}()
      }
      `,
      ["main", undefined, undefined],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});
