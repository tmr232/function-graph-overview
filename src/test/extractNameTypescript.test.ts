import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/cfg.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

const namesFrom = (code: string) =>
  [...iterFunctions(code, "TypeScript")].map((f) =>
    extractFunctionName(f, "TypeScript"),
  );

describe("TypeScript: arrow functions", () => {
  test.each([
    [
      "arrow with variable binding and generic",
      "const returnInArray = <T,>(value: T): T[] => {};",
      ["returnInArray"],
    ],
    [
      "unnamed arrow with type parameters",
      "<T,>(value: T): T[] => {};",
      [undefined],
    ],
    [
      "arrow functions inside function body",
      `
      function f() {
        const b = n => n + 1;
        const c = async () => { return 1; };
        const d = () => () => {};
      }
      `,
      ["f", "b", "c", "d", undefined],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("TypeScript: function declarations and expressions", () => {
  test.each([
    [
      "named function expression assigned to const",
      "const myFunction = function(name: string): string {};",
      ["myFunction"],
    ],
    [
      "named function expression with inner name (alias kept)",
      "const sum = function add(): number {};",
      ["add"],
    ],
    [
      "anonymous function expression (standalone)",
      "function(name: string): string {};",
      [undefined],
    ],
  ])("expression variants: %s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });

  test.each([
    [
      "named generator function expression assigned to const",
      "const fn = function* myGenerator<T>(input: T): Generator<number> {};",
      ["myGenerator"],
    ],
    ["async generator declaration", "async function* stream() {}", ["stream"]],
  ])("generator/async variants: %s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("TypeScript: assignments", () => {
  test.each([
    [
      "simple assignment expression inside a function",
      `
        function f() {
          let x;
          x = () => {};
        }
      `,
      ["f", "x"],
    ],
    [
      "multiple assignment expressions",
      "x = () => {}, y = () => {};",
      ["x", "y"],
    ],
    ["chained assignment expression", "let x = y = z = () => {};", ["z"]],
    [
      "nested assignment with named inner function",
      "let a; a = b = function inner() {};",
      ["inner"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("TypeScript: IIFE patterns", () => {
  test.each([
    [
      "arrow IIFE inside function body",
      `
        function f() {
          const g = () => {};
          (() => {})();
        }
      `,
      ["f", "g", undefined],
    ],
    ["named function-expression IIFE", "(function Boot() {})();", ["Boot"]],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("TypeScript: objects and classes", () => {
  test("object literal methods and properties", () => {
    const code = `
      const o = {
        a: () => {},
        b() {},
        *gen() { yield 1; },
        async c() {},
        ["computed"]() {},
        "quoted": function named() {},
        [id]: function computed() {}
      };
    `;
    expect(namesFrom(code)).toEqual([
      undefined,
      "b",
      "gen",
      "c",
      '["computed"]',
      "named",
      "computed",
    ]);
  });

  describe("TypeScript: class members", () => {
    test.each([
      [
        "methods, fields, accessors (incl. private + arrow field)",
        `
        class C {
          constructor() {}
          m() {}
          static s() {}
          async a() {}
          *g() {}
          field = () => {};
          #private() {}
          get x() {}
          set x(v: number) {}
        }
      `,
        ["constructor", "m", "s", "a", "g", "field", "#private", "x", "x"],
      ],
      [
        "class expression in extends with inline base",
        `
        class C extends ( () => class Base { m(){} } )() {}
      `,
        [undefined, "m"],
      ],
      [
        "member assignments",
        `
      const o: any = {};
      o.x = function named() {};
      o.y = () => {};
      `,
        ["named", "o.y"],
      ],
    ])("%s", (_title, code, expected) => {
      expect(namesFrom(code)).toEqual(expected);
    });
  });
});

describe("TypeScript: exports", () => {
  test.each([
    [
      "default export with named function",
      "export default function main() {}",
      ["main"],
    ],
    [
      "default export with anonymous function",
      "export default function () {}",
      [undefined],
    ],
    [
      "export const with arrow function",
      "export const myFunc = () => {};",
      ["myFunc"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("TypeScript: nesting and complex structures", () => {
  test.each([
    [
      "deeply nested functions",
      `
      function f() {
        const myFunc = () => {
          (() => {
            const innerFunc = () => {
              (() => {})();
            };
            function x() {}
            function y() {}
          })();
        };
      }
      `,
      ["f", "myFunc", undefined, "innerFunc", undefined, "x", "y"],
    ],
    [
      "nested class with methods inside function",
      `
      const outer = function namedOuter() {
        class A {
          m() {
            class B {
              n() {}
            }
          }
        }
      }
      `,
      ["namedOuter", "m", "n"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("TypeScript: destructuring and defaults", () => {
  test.each([
    [
      "default param is named function",
      "function f(x = function g() {}) {}",
      ["f", "g"],
    ],
    ["array pattern default is arrow", "const [a = () => {}] = [];", ["a"]],
    ["default param is arrow", "function f(x = () => {}) {}", ["f", "x"]],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("TypeScript: expression contexts", () => {
  describe("arrays and conditionals", () => {
    test.each([
      [
        "array: unnamed arrow, named fn, generator",
        "const arr = [() => {}, function named() {}, function* gen(){ yield 1; }];",
        [undefined, "named", "gen"],
      ],
      [
        "ternary: unnamed arrow vs named fn",
        "const f = true ? () => {} : function alt() {};",
        [undefined, "alt"],
      ],
      [
        "nested ternary: all unnamed arrows",
        "const f = cond ? (() => {}) : (other ? () => {} : () => {});",
        [undefined, undefined, undefined],
      ],
    ])("%s", (_title, code, expected) => {
      expect(namesFrom(code)).toEqual(expected);
    });
  });

  describe("logical expressions", () => {
    test("nullish coalescing with unnamed arrows", () => {
      const code = "const f = (() => {}) ?? (() => {});";
      expect(namesFrom(code)).toEqual([undefined, undefined]);
    });
  });

  describe("various expressions", () => {
    test.each([
      [
        "template literal with inline function",
        "const str = `${function f(){}}`;",
        ["f"],
      ],
      ["new call with function arg", "new C(function inner() {})", ["inner"]],
      ["typeof function", "const t = typeof function fn() {};", ["fn"]],
    ])("%s", (_title, code, expected) => {
      expect(namesFrom(code)).toEqual(expected);
    });
  });

  describe("callbacks and higher-order", () => {
    test.each([
      [
        "setTimeout named callback",
        "setTimeout(function tick(){}, 0);",
        ["tick"],
      ],
      ["array.map with unnamed arrow", "[1,2,3].map(n => n + 1);", [undefined]],
    ])("%s", (_title, code, expected) => {
      expect(namesFrom(code)).toEqual(expected);
    });
  });

  describe("static class blocks and labels", () => {
    test.each([
      [
        "static block with IIFE",
        `
          class C {
            static {
              (function init() {})();
            }
          }
        `,
        ["init"],
      ],
      [
        "labeled block with named fn and unnamed arrow IIFE",
        `
          label: {
            function f() {}
            (() => {})();
          }
        `,
        ["f", undefined],
      ],
    ])("%s", (_title, code, expected) => {
      expect(namesFrom(code)).toEqual(expected);
    });
  });

  describe("async/await and generator contexts", () => {
    test.each([
      [
        "await calling named function",
        "async function f() { await (function g() {})(); }",
        ["f", "g"],
      ],
      [
        "yield calling unnamed arrow",
        "function* g() { yield (() => {})(); }",
        ["g", undefined],
      ],
      [
        "async arrow containing generator decl",
        "const a = async () => { function* g() {} };",
        ["a", "g"],
      ],
    ])("%s", (_title, code, expected) => {
      expect(namesFrom(code)).toEqual(expected);
    });
  });
});
