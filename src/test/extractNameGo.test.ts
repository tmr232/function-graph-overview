import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

/**
 * Helpers
 */
const namesFrom = (code: string) =>
  [...iterFunctions(code, "Go")].map((f) => extractFunctionName(f, "Go"));
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
    expect(namesFrom(code)).toEqual(["makeAdder", "<anonymous>"]);
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
  test("function assigned alongside non-function expression", () => {
    const code = `
      package main
      func main() {
        msg, handler := "go" + "lang", func() {}
        x, y, _ := "Hello", 123, func() {}
        _ = msg; _ = handler
      }
    `;
    expect(namesFrom(code)).toEqual(["main", "handler", "_"]);
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
    expect(foundNames).toEqual(expectedNames);
  });
});

/* ================================
   ADVANCED ASSIGNMENTS
================================ */
describe("Go: advanced assignments", () => {
  // test("multiple vars with one func literal", () => {
  //   const code = `
  //     package main
  //     func main() {
  //       var a, b = func() {}
  //       _ = a; _ = b
  //     }
  //   `;
  //   // both a and b point to the same func literal
  //   expect(namesFrom(code)).toEqual(["main", "a"]);
  // });

  test("short var declaration with blank identifier", () => {
    const code = `
      package main
      func main() {
        x, _ := func() {}, func() {}
        _ = x
      }
    `;
    expect(namesFrom(code)).toEqual(["main", "x", "_"]);
  });

  test("reassignment with existing var and new func", () => {
    const code = `
      package main
      func main() {
        x := 1
        x, y := x, func() {}
        _ = x; _ = y
      }
    `;
    expect(namesFrom(code)).toEqual(["main", "y"]);
  });
});

/* ================================
   FUNCTIONS AS FIELDS AND LITERALS
================================ */
describe("Go: functions in literals", () => {
  test("func literal inside struct literal", () => {
    const code = `
      package main
      type Holder struct {
        fn func()
      }
      var h = Holder{
        fn: func() {},
      }
    `;
    expect(namesFrom(code)).toEqual(["<anonymous>"]);
  });

  test("map with func literal values", () => {
    const code = `
      package main
      var m = map[string]func(){
        "a": func() {},
        "b": func() {},
      }
    `;
    expect(namesFrom(code)).toEqual(["<anonymous>", "<anonymous>"]);
  });
});

/* ================================
   NESTED + RETURN CASES
================================ */
describe("Go: nested returns", () => {
  test("returning func literal from another function", () => {
    const code = `
      package main
      func outer() func() {
        return func() {}
      }
    `;
    expect(namesFrom(code)).toEqual(["outer", "<anonymous>"]);
  });

  test("immediately invoked func literal (IIFE style)", () => {
    const code = `
      package main
      func main() {
        func() { println("hi") }()
      }
    `;
    expect(namesFrom(code)).toEqual(["main", "<anonymous>"]);
  });
});

/* ================================
   INTERFACES AND METHODS
================================ */
describe("Go: interfaces", () => {
  test("interface with function type", () => {
    const code = `
      package main
      type Runner interface {
        Run()
      }
      func (r *Runner) Run() {}
    `;
    // interface methods are not functions we parse, only the Run impl is
    expect(namesFrom(code)).toEqual(["Run"]);
  });
});
