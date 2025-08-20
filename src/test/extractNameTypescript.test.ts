import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

/**
 * Helpers
 */
const namesFrom = (code: string) =>
  [...iterFunctions(code, "TypeScript")].map((f) =>
    extractFunctionName(f, "TypeScript"),
  );

describe("arrow functions", () => {
  test("arrow with variable binding and generic", () => {
    const code = "const returnInArray = <T,>(value: T): T[] => {};";
    const func = iterFunctions(code, "TypeScript").next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("returnInArray");
  });

  test("arrow variations", () => {
    const code1 = "<T,>(value: T): T[] => {};";
    expect(namesFrom(code1)).toEqual(["<anonymous>"]);

    const code2 = `
      function f() {
        const b = n => n + 1;
        const c = async () => { return 1; };
        const d = () => () => {};
      }
    `;
    expect(namesFrom(code2)).toEqual(["f", "b", "c", "d", "<anonymous>"]);
  });
});

describe("function declarations and expressions", () => {
  test("function expression variants", () => {
    const code1 = "const myFunction = function(name: string): string {};";
    expect(namesFrom(code1)).toEqual(["myFunction"]);

    const code2 = "const sum = function add(): number {};";
    expect(namesFrom(code2)).toEqual(["add"]);

    const code3 = "function(name: string): string {};";
    expect(namesFrom(code3)).toEqual(["<anonymous>"]);
  });

  test("generator and async functions", () => {
    const code1 =
      "const fn = function* myGenerator<T>(input: T): Generator<number> {};";
    expect(namesFrom(code1)).toEqual(["myGenerator"]);

    const code2 = "async function* stream() {}";
    expect(namesFrom(code2)).toEqual(["stream"]);
  });
});

describe("assignments", () => {
  test("assignment expressions and chained assignments", () => {
    const code1 = `
      function f() {
        let x;
        x = () => {};
      }
    `;
    expect(namesFrom(code1)).toEqual(["f", "x"]);

    const code2 = "x = () => {}, y = () => {};";
    expect(namesFrom(code2)).toEqual(["x", "y"]);

    const code3 = "let x = y = z = () => {};";
    expect(namesFrom(code3)).toEqual(["z"]);

    const code4 = "let a; a = b = function inner() {};";
    expect(namesFrom(code4)).toEqual(["inner"]);
  });
});

describe("IIFE patterns", () => {
  test("immediate function expressions", () => {
    const code1 = `
      function f() {
        const g = () => {};
        (() => {})();
      }
    `;
    expect(namesFrom(code1)).toEqual(["f", "g", "<anonymous>"]);

    const code2 = "(function Boot() {})();";
    expect(namesFrom(code2)).toEqual(["Boot"]);

    const code3 = "(async () => {})();";
    expect(namesFrom(code3)).toEqual(["<anonymous>"]);
  });
});

describe("objects and classes", () => {
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
      "<anonymous>",
      "b",
      "gen",
      "c",
      '["computed"]',
      "named",
      "computed",
    ]);
  });

  test("class methods and fields", () => {
    const code = `
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
    `;
    expect(namesFrom(code)).toEqual([
      "constructor",
      "m",
      "s",
      "a",
      "g",
      "field",
      "#private",
      "x",
      "x",
    ]);

    const code2 = `
      class C extends ( () => class Base { m(){} } )() {}
    `;
    expect(namesFrom(code2)).toEqual(["<anonymous>", "m"]);
  });

  test("member assignments", () => {
    const code = `
      const o: any = {};
      o.x = function named() {};
      o.y = () => {};
    `;
    expect(namesFrom(code)).toEqual(["named", "o.y"]);
  });
});

describe("exports", () => {
  test("export patterns", () => {
    const code1 = "export default function main() {}";
    expect(namesFrom(code1)).toEqual(["main"]);

    const code2 = "export default function () {}";
    expect(namesFrom(code2)).toEqual(["<anonymous>"]);

    const code3 = "export const myFunc = () => {};";
    expect(namesFrom(code3)).toEqual(["myFunc"]);

    const code4 = "export = function main() {};";
    expect(namesFrom(code4)).toEqual(["main"]);
  });
});

describe("nesting and complex structures", () => {
  test("deeply nested functions", () => {
    const code = `
      function f() {
        const myFunc = () => {
          (() => {
            const innerFunc = () => {
              (() => {})();
            };
            function x() {}
          })();
        };
      }
    `;
    expect(namesFrom(code)).toEqual([
      "f",
      "myFunc",
      "<anonymous>",
      "innerFunc",
      "<anonymous>",
      "x",
    ]);
  });

  test("multiple function declarations with duplicate names", () => {
    const code = `
      function f() {
        function x() {}
        function y() {}
        function b() {
          function o() {}
          function o() {} // duplicate name
        }
      }
    `;
    expect(namesFrom(code)).toEqual(["f", "x", "y", "b", "o", "o"]);
  });

  test("nested class with methods inside function", () => {
    const code = `
      const outer = function namedOuter() {
        class A {
          m() {
            class B {
              n() {}
            }
          }
        }
      }
    `;
    expect(namesFrom(code)).toEqual(["namedOuter", "m", "n"]);
  });
});

describe("overloads", () => {
  test("function and method overloads", () => {
    const code1 = `
      function foo(a: string): void;
      function foo(a: number): void;
      function foo(a: any): void {}
    `;
    expect(namesFrom(code1)).toEqual(["foo"]);

    const code2 = `
      class C {
        m(a: string): void;
        m(a: number): void;
        m(a: any): void {}
      }
    `;
    expect(namesFrom(code2)).toEqual(["m"]);
  });
});

describe("destructuring and defaults", () => {
  test("destructuring with function defaults", () => {
    const code1 = "function f(x = function g() {}) {}";
    expect(namesFrom(code1)).toEqual(["f", "g"]);

    const code2 = "const { a = function def() {} } = {};";
    expect(namesFrom(code2)).toEqual(["def"]);

    const code3 = "const [a = () => {}] = [];";
    expect(namesFrom(code3)).toEqual(["a"]);

    const code4 = "function f(x = () => {}) {}";
    expect(namesFrom(code4)).toEqual(["f", "x"]);
  });
});

describe("namespaces and modules", () => {
  test("functions inside namespace", () => {
    const code = `
      namespace N {
        export function a() {}
        function b() {}
        namespace Inner {
          function c() {}
        }
      }
    `;
    expect(namesFrom(code)).toEqual(["a", "b", "c"]);
  });
});

describe("expression contexts", () => {
  test("functions in arrays and conditionals", () => {
    const code1 =
      "const arr = [() => {}, function named() {}, function* gen(){ yield 1; }];";
    expect(namesFrom(code1)).toEqual(["<anonymous>", "named", "gen"]);

    const code2 = "const f = true ? () => {} : function alt() {};";
    expect(namesFrom(code2)).toEqual(["<anonymous>", "alt"]);

    const code3 =
      "const f = cond ? (() => {}) : (other ? () => {} : () => {});";
    expect(namesFrom(code3)).toEqual([
      "<anonymous>",
      "<anonymous>",
      "<anonymous>",
    ]);
  });

  test("functions in logical expressions", () => {
    const code1 = "const f = (() => {}) ?? (() => {});";
    expect(namesFrom(code1)).toEqual(["<anonymous>", "<anonymous>"]);

    const code2 = "const f = (async () => {}) || (async () => {});";
    expect(namesFrom(code2)).toEqual(["<anonymous>", "<anonymous>"]);
  });

  test("functions in various expressions", () => {
    const code1 = "const str = `${function f(){}}`;";
    expect(namesFrom(code1)).toEqual(["f"]);

    const code2 = "void (function gone() {})();";
    expect(namesFrom(code2)).toEqual(["gone"]);

    const code3 = "new C(function inner() {})";
    expect(namesFrom(code3)).toEqual(["inner"]);

    const code4 = "delete (function doomed() {})";
    expect(namesFrom(code4)).toEqual(["doomed"]);

    const code5 = "const t = typeof function fn() {};";
    expect(namesFrom(code5)).toEqual(["fn"]);

    const code6 = "(0, () => {})();";
    expect(namesFrom(code6)).toEqual(["<anonymous>"]);
  });

  test("functions in control flow", () => {
    const code1 = "while ((function cond(){ return false; })()) {}";
    expect(namesFrom(code1)).toEqual(["cond"]);

    const code2 = `
      switch (0) {
        case (function pick(){ return 1; })(): break;
      }
    `;
    expect(namesFrom(code2)).toEqual(["pick"]);

    const code3 =
      "for (let i = (function init(){ return 0; })(); i < 1; i++) {}";
    expect(namesFrom(code3)).toEqual(["init"]);
  });

  test("callbacks and higher-order functions", () => {
    const code1 = "setTimeout(function tick(){}, 0);";
    expect(namesFrom(code1)).toEqual(["tick"]);

    const code2 = "[1,2,3].map(n => n + 1);";
    expect(namesFrom(code2)).toEqual(["<anonymous>"]);

    const code3 = "obj?.method(() => {});";
    expect(namesFrom(code3)).toEqual(["<anonymous>"]);
  });

  test("static class blocks and labeled statements", () => {
    const code1 = `
      class C {
        static {
          (function init() {})();
        }
      }
    `;
    expect(namesFrom(code1)).toEqual(["init"]);

    const code2 = `
      label: {
        function f() {}
        (() => {})();
      }
    `;
    expect(namesFrom(code2)).toEqual(["f", "<anonymous>"]);
  });

  test("async/await and generator contexts", () => {
    const code1 = "async function f() { await (function g() {})(); }";
    expect(namesFrom(code1)).toEqual(["f", "g"]);

    const code2 = "function* g() { yield (() => {})(); }";
    expect(namesFrom(code2)).toEqual(["g", "<anonymous>"]);

    const code3 = "const a = async () => { function* g() {} };";
    expect(namesFrom(code3)).toEqual(["a", "g"]);
  });
});

describe("special cases", () => {
  test("decorators and enums", () => {
    const code1 = `
      function dec(target: any) {}
      @dec
      class C {
        m() {}
        y = () => 2;
      }
    `;
    expect(namesFrom(code1)).toEqual(["dec", "m", "y"]);

    const code2 = `
      enum E {
        A = 1,
        B = () => 2
      }
    `;
    expect(namesFrom(code2)).toEqual(["<anonymous>"]);
  });

  test("edge cases with parentheses and wrappers", () => {
    const code1 = "(export default (() => {}));";
    expect(namesFrom(code1)).toEqual(["<anonymous>"]);

    const code2 = `
      function outer() {
        return function inner() {};
      }
    `;
    expect(namesFrom(code2)).toEqual(["outer", "inner"]);

    const code3 = "import((() => './path')());";
    expect(namesFrom(code3)).toEqual(["<anonymous>"]);
  });

  test("template literals and spread operators", () => {
    const code1 = "tag`${(() => {})}`;";
    expect(namesFrom(code1)).toEqual(["<anonymous>"]);

    const code2 = "(function tag() {} )`template`;";
    expect(namesFrom(code2)).toEqual(["tag"]);

    const code3 = "const arr = [...[function f() {}]];";
    expect(namesFrom(code3)).toEqual(["f"]);

    const code4 = "const o = { ...{ fn: function spreaded() {} } };";
    expect(namesFrom(code4)).toEqual(["spreaded"]);
  });

});
