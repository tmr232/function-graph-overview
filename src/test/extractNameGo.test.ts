import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

const namesFrom = (code: string) =>
  [...iterFunctions(code, "Go")].map((f) => extractFunctionName(f, "Go"));
/* ================================
   BASIC FUNCTIONS
================================ */
describe("Go: basic functions", () => {
  test("named top-level functions", () => {
    const code = `
      func Add(a int, b int) int { return a + b }
      func greet(name string) string { return "Hello " + name }
    `;
    expect(namesFrom(code)).toEqual(["Add", "greet"]);
  });

  test("anonymous functions assigned to variables", () => {
    const code = `
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
      func makeAdder(base int) func(int) int {
        return func(x int) int { return base + x }
      }
    `;
    expect(namesFrom(code)).toEqual(["makeAdder", "<anonymous>"]);
  });

  test("functions in composite literals", () => {
    const code = `
      var handlers = []func(int){
        func(x int) {},
        func(y int) {},
      }
    `;
    expect(namesFrom(code)).toEqual(["<anonymous>", "<anonymous>"]);
  });

  test("functions used as parameters", () => {
    const code = `
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
      func main() {
        var x, y = func() {}, func() {}
        _ = x; _ = y
      }
    `;
    expect(namesFrom(code)).toEqual(["main", "x", "y"]);
  });

  test("mix declared function + anonymous func", () => {
    const code = `
      func Declared() {}
      func main() {
        x, y, z := Declared, func() {}, "Hello"
        _ = x; _ = y; _ = z
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
    expect(namesFrom(code)).toEqual(["main", "x", "y"]);
  });
});

/* ================================
   ADVANCED ASSIGNMENTS
================================ */
describe("Go: advanced assignments", () => {
  test("multiple vars with one func literal", () => {
    const code = `
      func main() {
        var a, b = func() {}
        _ = a; _ = b
      }
    `;
    // both a and b get the same func literal.
    // either could be used, but we take the first (a) as the name.
    expect(namesFrom(code)).toEqual(["main", "a"]);
  });
});

/* ================================
   INTERFACES AND METHODS
================================ */
describe("Go: interfaces", () => {
  test("interface with function type", () => {
    const code = `
      type Runner interface {
        Run()
      }
      func (r *Runner) Run() {}
    `;
    // interface methods are not functions we parse, only the Run impl is
    expect(namesFrom(code)).toEqual(["Run"]);
  });
});

test("plain assignment =", () => {
  const code = `
    package main
    func main() {
      var x func()
      x = func() {}
      _ = x
    }`;
  expect(namesFrom(code)).toEqual(["main", "x"]);
});

test("selector on LHS (=)", () => {
  const code = `
    package main
    type S struct{ fn func() }
    func main() {
      var s S
      s.fn = func() {}
      _ = s
    }`;
  expect(namesFrom(code)).toEqual(["main", "s.fn"]);
});

test("type on var_spec with init", () => {
  const code = `
    package main
    func main() {
      var f func() = func() {}
      _ = f
    }`;
  expect(namesFrom(code)).toEqual(["main", "f"]);
});

test("go/defer with func literal → anonymous", () => {
  const code = `
    package main
    func main() {
      go func() {}()
      defer func() {}()
    }`;
  expect(namesFrom(code)).toEqual(["main", "<anonymous>", "<anonymous>"]);
});

describe("Go: keyed elements - not supported", () => {
  test("simple keys", () => {
    const code = `
      var _ = map[interface{}]func(){
        "simple":        func() {},  
        'r':             func() {},  
        fmt.Sprint(1):   func() {},         
        T(1):            func() {},        
        [2]int{1,2}:     func() {},   
        1 + 2:           func() {},     
      }
    `;
    expect(namesFrom(code)).toEqual([
      "<anonymous>",
      "<anonymous>",
      "<anonymous>",
      "<anonymous>",
      "<anonymous>",
      "<anonymous>",
    ]);
  });
});
