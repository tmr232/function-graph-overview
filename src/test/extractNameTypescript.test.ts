import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

/**
 * Helpers
 */
const namesFrom = (code: string) =>
  [...iterFunctions(code, "TypeScript")].map((f) =>
    extractFunctionName(f, "TypeScript")
  );

describe("arrow functions", () => {
  test("arrow with variable (generic)", () => {
    const code = "const returnInArray = <T,>(value: T): T[] => {};";
    const func = iterFunctions(code, "TypeScript").next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("returnInArray");
  });

  test("arrow with no parent binding", () => {
    const code = "<T,>(value: T): T[] => {};";
    const func = iterFunctions(code, "TypeScript").next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
  });

  test("arrow variations (expression vs block, async, arrow returning arrow)", () => {
    const code1 = `
      function f() {
        const b = n => n + 1;
        const c = () => { return 1; };
      }
    `;
    expect(namesFrom(code1)).toEqual(["f", "b", "c"]);

    const code2 = `
      function f() {
        const a = async () => {};
      }
    `;
    expect(namesFrom(code2)).toEqual(["f", "a"]);

    const code3 = `
      function f() {
        const a = () => () => {};
      }
    `;
    expect(namesFrom(code3)).toEqual(["f", "a", undefined]);
  });

  test("arrow functions assigned within multi-declarator -> ambiguous", () => {
    //const code = "x = () => {}, y = () => {}, z = function named() {};";
    const code = "let x, y, z; x = () => {}, y = () => {}, z = function named() {};"
    const func = iterFunctions(code, "TypeScript").next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
  });
});

describe("function declarations / expressions / generators", () => {
  test("function expression variants (var-bound, named, unbound)", () => {
    const code1 = "const myFunction = function(name1: string): string {};";
    expect(
      extractFunctionName(
        iterFunctions(code1, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe("myFunction");

    const code2 = "const sum = function add(): number {};";
    expect(
      extractFunctionName(
        iterFunctions(code2, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe("add");

    const code3 = "function(name1: string): string {};";
    expect(
      extractFunctionName(
        iterFunctions(code3, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe(undefined);
  });

  test("generator function with variable and inner name", () => {
    const code =
      "const fn = function* myGenerator<T>(input: T): Generator<number> {};";
    const func = iterFunctions(code, "TypeScript").next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("myGenerator");
  });

  test("async function declarations (regular + async generator)", () => {
    const code1 = `async function load() {}`;
    expect(
      extractFunctionName(
        iterFunctions(code1, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe("load");

    const code2 = `async function* stream() {}`;
    expect(
      extractFunctionName(
        iterFunctions(code2, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe("stream");
  });
});

describe("assignments", () => {
  test("assignment expressions (identifier = func)", () => {
    // assignment after declaration
    const code1 = `
      function f() {
        let x;
        x = () => {};
      }
    `;
    expect(namesFrom(code1)).toEqual(["f", "x"]);

    // named function expression assignment
    const code2 = `
      let x = 1;
      x = function foo() {};
    `;
    expect(namesFrom(code2)).toEqual(["foo"]);
  });
});

describe("IIFE patterns", () => {
  test("anonymous IIFE alongside named arrow", () => {
    const code = `
      function f() {
        const g = () => {};
        (() => {})();
      }
    `;
    expect(namesFrom(code)).toEqual(["f", "g", undefined]);
  });

  test("named IIFE", () => {
    const code = `(function Boot() {})();`;
    const func = iterFunctions(code, "TypeScript").next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("Boot");
  });

  test("anonymous arrow IIFE with argument", () => {
    const code = `
      function f() {
        ((arg => arg * 2))(21);
      }
    `;
    expect(namesFrom(code)).toEqual(["f", undefined]);
  });
});

describe("objects and classes", () => {
  test("object literal: method shorthand, arrow property, generator, async, computed", () => {
    const code1 = `
      const o = {
        a: () => {},
        b() {}
      };
    `;
    expect(namesFrom(code1)).toEqual(["a", "b"]);

    const code2 = `const o = { *gen() { yield 1; } };`;
    expect(
      extractFunctionName(
        iterFunctions(code2, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe("gen");

    const code3 = `
      const o = {
        a: async () => {},
        async b() {}
      };
    `;
    expect(namesFrom(code3)).toEqual(["a", "b"]);
  });

  test("class methods and fields (incl. arrow field)", () => {
    const code1 = `
      class C {
        m() {}
        static s() {}
        async a() {}
        *g() {}
      };
    `;
    expect(namesFrom(code1)).toEqual(["m", "s", "a", "g"]);

    const code2 = `
      class C {
        m = () => {};
        n = 1;
      }
    `;
    expect(namesFrom(code2)).toEqual(["m"]);
  });

  test("method_definition", () => {
    const code = "class SmartPhone { setPrice(smartPhonePrice: number) : void {} }";
    const func = iterFunctions(code, "TypeScript").next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("setPrice");
  });
});

describe("exports", () => {
  test("default export (named & anonymous) and exported const arrow; plus named export", () => {
    const code1 = `export default function main() {}`;
    expect(
      extractFunctionName(
        iterFunctions(code1, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe("main");

    const code2 = `export default function () {}`;
    expect(
      extractFunctionName(
        iterFunctions(code2, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe(undefined);

    const code3 = `export const myFunc = () => {};`;
    expect(
      extractFunctionName(
        iterFunctions(code3, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe("myFunc");

    // moved here (was stand-alone): named export (non-default)
    const code4 = `export function getStatementHandlers(): StatementHandlers {}`;
    expect(
      extractFunctionName(
        iterFunctions(code4, "TypeScript").next().value,
        "TypeScript"
      )
    ).toBe("getStatementHandlers");
  });
});

describe("structure / nesting / overloads / miscellany", () => {
  test("deeply nested functions (mixed named/anonymous)", () => {
    const code = `
      function f() {
        const myFunc = () => {
          (() => {
            const innerFunc = () => {
              (() => {
                console.log("deeply nested");
              })();
            };
            innerFunc();
            function x() {}
          })();
        };
      }
    `;
    expect(namesFrom(code)).toEqual(["f", "myFunc", undefined, "innerFunc", undefined, "x"]);
  });

  test("multiple function declarations (including duplicate name in same scope)", () => {
    const code = `
      function f() {
        function x() {}
        function y() {}
        function z() {}
        function d() {}
        function k() {}
        function b() {
          function o() {}
          function p() {}
          function o() {}
        }
      }
    `;
    expect(namesFrom(code)).toEqual(["f", "x", "y", "z", "d", "k", "b", "o", "p", "o"]);
  });

  test("function overloads collapse to single implementation", () => {
    const code = `
      function foo(a: string): void;
      function foo(a: number): void;
      function foo(a: any): void {}
    `;
    expect(namesFrom(code)).toEqual(["foo"]);
  });

  test("misc: arrays, ternaries, callbacks", () => {
    const codeArr = `const arr = [() => {}, function named() {}];`;
    expect(namesFrom(codeArr)).toEqual([undefined, "named"]);

    const codeTern = `const f = true ? () => {} : () => {};`;
    expect(namesFrom(codeTern)).toEqual([undefined, undefined]);

    const codeCb = `[1,2,3].map(n => n + 1);`;
    const func = iterFunctions(codeCb, "TypeScript").next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
  });
});