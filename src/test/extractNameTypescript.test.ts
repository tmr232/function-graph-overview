import { describe, expect, test } from "vitest";
import { extractFunctionName, extractTaggedValueFromTreeSitterQuery } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

/**
 * Helpers
 */
const namesFrom = (code: string) =>
  [...iterFunctions(code, "TypeScript")].map((f) =>
    extractFunctionName(f, "TypeScript"),
  );

// describe("arrow functions", () => {
//   test("arrow with variable (generic)", () => {
//     const code = "const returnInArray = <T,>(value: T): T[] => {};";
//     const func = iterFunctions(code, "TypeScript").next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe("returnInArray");
//   });

//   test("arrow with no parent binding", () => {
//     const code = "<T,>(value: T): T[] => {};";
//     const func = iterFunctions(code, "TypeScript").next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
//   });

//   test("arrow variations (expression vs block, async, arrow returning arrow)", () => {
//     const code1 = `
//       function f() {
//         const b = n => n + 1;
//         const c = () => { return 1; };
//       }
//     `;
//     expect(namesFrom(code1)).toEqual(["f", "b", "c"]);

//     const code2 = `
//       function f() {
//         const a = async () => {};
//       }
//     `;
//     expect(namesFrom(code2)).toEqual(["f", "a"]);

//     const code3 = `
//       function f() {
//         const a = () => () => {};
//       }
//     `;
//     expect(namesFrom(code3)).toEqual(["f", "a", undefined]);
//   });

//   test("arrow functions assigned within multi-declarator -> ambiguous", () => {
//     // const code = "x = () => {}, y = () => {}, z = function named() {};";
//     const code =
//       "let x, y, z; x = () => {}, y = () => {}, z = function named() {};";
//     const func = iterFunctions(code, "TypeScript").next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
//   });
// });

// describe("function declarations / expressions / generators", () => {
//   test("function expression variants (var-bound, named, unbound)", () => {
//     const code1 = "const myFunction = function(name1: string): string {};";
//     expect(
//       extractFunctionName(
//         iterFunctions(code1, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe("myFunction");

//     const code2 = "const sum = function add(): number {};";
//     expect(
//       extractFunctionName(
//         iterFunctions(code2, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe("add");

//     const code3 = "function(name1: string): string {};";
//     expect(
//       extractFunctionName(
//         iterFunctions(code3, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe(undefined);
//   });

//   test("generator function with variable and inner name", () => {
//     const code =
//       "const fn = function* myGenerator<T>(input: T): Generator<number> {};";
//     const func = iterFunctions(code, "TypeScript").next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe("myGenerator");
//   });

//   test("async function declarations (regular + async generator)", () => {
//     const code1 = "async function load() {}";
//     expect(
//       extractFunctionName(
//         iterFunctions(code1, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe("load");

//     const code2 = "async function* stream() {}";
//     expect(
//       extractFunctionName(
//         iterFunctions(code2, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe("stream");
//   });
// });

// describe("assignments", () => {
//   test("assignment expressions (identifier = func)", () => {
//     // assignment after declaration
//     const code1 = `
//       function f() {
//         let x;
//         x = () => {};
//       }
//     `;
//     expect(namesFrom(code1)).toEqual(["f", "x"]);

//     // named function expression assignment
//     const code2 = `
//       let x = 1;
//       x = function foo() {};
//     `;
//     expect(namesFrom(code2)).toEqual(["foo"]);
//   });
// });

// describe("IIFE patterns", () => {
//   test("anonymous IIFE alongside named arrow", () => {
//     const code = `
//       function f() {
//         const g = () => {};
//         (() => {})();
//       }
//     `;
//     expect(namesFrom(code)).toEqual(["f", "g", undefined]);
//   });

//   test("named IIFE", () => {
//     const code = "(function Boot() {})();";
//     const func = iterFunctions(code, "TypeScript").next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe("Boot");
//   });

//   test("anonymous arrow IIFE with argument", () => {
//     const code = `
//       function f() {
//         ((arg => arg * 2))(21);
//       }
//     `;
//     expect(namesFrom(code)).toEqual(["f", undefined]);
//   });
// });

// describe("objects and classes", () => {
//   test("object literal: method shorthand, arrow property, generator, async, computed", () => {
//     const code1 = `
//       const o = {
//         a: () => {},
//         b() {}
//       };
//     `;
//     expect(namesFrom(code1)).toEqual(["a", "b"]);

//     const code2 = "const o = { *gen() { yield 1; } };";
//     expect(
//       extractFunctionName(
//         iterFunctions(code2, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe("gen");

//     const code3 = `
//       const o = {
//         a: async () => {},
//         async b() {}
//       };
//     `;
//     expect(namesFrom(code3)).toEqual(["a", "b"]);
//   });

//   test("class methods and fields (incl. arrow field)", () => {
//     const code1 = `
//       class C {
//         m() {}
//         static s() {}
//         async a() {}
//         *g() {}
//       }
//     `;
//     expect(namesFrom(code1)).toEqual(["m", "s", "a", "g"]);

//     const code2 = `
//       class C {
//         m = () => {};
//         n = 1;
//       }
//     `;
//     expect(namesFrom(code2)).toEqual(["m"]);
//   });

//   test("method_definition", () => {
//     const code =
//       "class SmartPhone { setPrice(smartPhonePrice: number) : void {} }";
//     const func = iterFunctions(code, "TypeScript").next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe("setPrice");
//   });
// });

// describe("exports", () => {
//   test("default export (named & anonymous) and exported const arrow; plus named export", () => {
//     const code1 = "export default function main() {}";
//     expect(
//       extractFunctionName(
//         iterFunctions(code1, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe("main");

//     const code2 = "export default function () {}";
//     expect(
//       extractFunctionName(
//         iterFunctions(code2, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe(undefined);

//     const code3 = "export const myFunc = () => {};";
//     expect(
//       extractFunctionName(
//         iterFunctions(code3, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe("myFunc");

//     // moved here (was stand-alone): named export (non-default)
//     const code4 =
//       "export function getStatementHandlers(): StatementHandlers {}";
//     expect(
//       extractFunctionName(
//         iterFunctions(code4, "TypeScript").next().value,
//         "TypeScript",
//       ),
//     ).toBe("getStatementHandlers");
//   });
// });

// describe("structure / nesting / overloads / miscellany", () => {
//   test("deeply nested functions (mixed named/anonymous)", () => {
//     const code = `
//       function f() {
//         const myFunc = () => {
//           (() => {
//             const innerFunc = () => {
//               (() => {
//                 console.log("deeply nested");
//               })();
//             };
//             innerFunc();
//             function x() {}
//           })();
//         };
//       }
//     `;
//     expect(namesFrom(code)).toEqual([
//       "f",
//       "myFunc",
//       undefined,
//       "innerFunc",
//       undefined,
//       "x",
//     ]);
//   });

//   test("multiple function declarations (including duplicate name in same scope)", () => {
//     const code = `
//       function f() {
//         function x() {}
//         function y() {}
//         function z() {}
//         function d() {}
//         function k() {}
//         function b() {
//           function o() {}
//           function p() {}
//           function o() {}
//         }
//       }
//     `;
//     expect(namesFrom(code)).toEqual([
//       "f",
//       "x",
//       "y",
//       "z",
//       "d",
//       "k",
//       "b",
//       "o",
//       "p",
//       "o",
//     ]);
//   });

//   test("function overloads collapse to single implementation", () => {
//     const code = `
//       function foo(a: string): void;
//       function foo(a: number): void;
//       function foo(a: any): void {}
//     `;
//     expect(namesFrom(code)).toEqual(["foo"]);
//   });

//   test("misc: arrays, ternaries, callbacks", () => {
//     const codeArr = "const arr = [() => {}, function named() {}];";
//     expect(namesFrom(codeArr)).toEqual([undefined, "named"]);

//     const codeTern = "const f = true ? () => {} : () => {};";
//     expect(namesFrom(codeTern)).toEqual([undefined, undefined]);

//     const codeCb = "[1,2,3].map(n => n + 1);";
//     const func = iterFunctions(codeCb, "TypeScript").next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
//   });
// });

// describe("additional coverage from TS function docs", () => {
//   describe("variable declarators & assignments", () => {
//     test("multiple declarators in one statement", () => {
//       const code = "const a = () => {}, b = function named() {}, c = 1;";
//       expect(namesFrom(code)).toEqual([undefined, "named"]);
//     });

//     test("logical/conditional assignment contexts", () => {
//       const code1 = "const f = true && function g() {};";
//       expect(namesFrom(code1)).toEqual(["g"]);

//       const code2 = "let h; h = (false || function k() {});";
//       expect(namesFrom(code2)).toEqual(["k"]);

//       const code3 = "const f = (cond ? function a(){} : function b(){});";
//       // order is a then b as both appear in source
//       expect(namesFrom(code3)).toEqual(["a", "b"]);
//     });

//     test("function in default parameter (inner named expression)", () => {
//       const code = "function f(x = function g() {}) {}";
//       expect(namesFrom(code)).toEqual(["f", "g"]);
//     });

//     test("destructuring default value contains a function", () => {
//       const code = "const { a = function def() {} } = {};";
//       expect(namesFrom(code)).toEqual(["def"]);
//     });
//   });

//   describe("computed names & member assignments", () => {
//     test("object literal with computed & string-literal keys", () => {
//       const code = `
//     const o = {
//   ["x-y"]() {},
//   [sym]() {},
//   "quoted": () => {},
//   "quoted2": function* gen() {},
//   "quoted3": function* () {}
// };
//   `;

//       expect(namesFrom(code)).toEqual([
//         '"x-y"',
//         "sym",
//         '"quoted"',
//         "gen",
//         '"quoted3"',
//       ]);
//     });

//     test("member assignment (obj.x = function...)", () => {
//       const code = `
//         const o:any = {};
//         o.x = function named() {};
//         o.y = () => {};
//       `;
//       // If your extractor only names identifiers on the left (not MemberExpressions),
//       // this should yield inner name for named function only; arrow has no inner name.
//       expect(namesFrom(code)).toEqual(["named", undefined]);
//     });
//   });

//   describe("classes: private, accessors, constructor, async/generator methods", () => {
//     test("private method (#m) is often not captured by simple identifier-only extractors", () => {
//       const code = "class C { #m(){} }";
//       // If your extractor does not read 'private_identifier', expect undefined.
//       expect(namesFrom(code)).toEqual([undefined]);
//     });

//     test("get/set accessors", () => {
//       const code = `
//         class C {
//           get x() {}
//           set x(v: number) {}
//         }
//       `;
//       expect(namesFrom(code)).toEqual(["x", "x"]);
//     });

//     test("constructor method", () => {
//       const code = "class C { constructor() {} }";
//       // Many extractors surface "constructor". If yours filters it out, adjust to [].
//       expect(namesFrom(code)).toEqual(["constructor"]);
//     });

//     test("async* (async generator) method in class and object", () => {
//       const code1 = "class C { async* stream() {} }";
//       expect(namesFrom(code1)).toEqual(["stream"]);

//       const code2 = "const o = { async* run() {} };";
//       expect(namesFrom(code2)).toEqual(["run"]);
//     });
//   });

//   describe("namespaces & modules", () => {
//     test("function inside namespace", () => {
//       const code = `
//         namespace N {
//           export function a() {}
//           function b() {}
//         }
//       `;
//       // Both have bodies; both should be picked up.
//       expect(namesFrom(code)).toEqual(["a", "b"]);
//     });

//     test("ambient declarations are typically ignored (no body)", () => {
//       const code = "declare function foo(a: number): void;";
//       // No function body -> most iterators won't return anything.
//       expect(namesFrom(code)).toEqual([]);
//     });
//   });

//   describe("exports: more combos", () => {
//     test("exported const with named function expression prefers inner name", () => {
//       const code = "export const a = function b() {};";
//       // Your extractor already prefers inner name for function expressions.
//       expect(namesFrom(code)).toEqual(["b"]);
//     });

//     test("export default anonymous arrow", () => {
//       const code = "export default () => {};";
//       expect(namesFrom(code)).toEqual([undefined]);
//     });

//     test("exported async generator declaration", () => {
//       const code = "export async function* feed() {}";
//       expect(namesFrom(code)).toEqual(["feed"]);
//     });
//   });

//   describe("callbacks & arrays & calls", () => {
//     test("named callback in call", () => {
//       const code = "setTimeout(function tick(){}, 0);";
//       expect(namesFrom(code)).toEqual(["tick"]);
//     });

//     test("array of functions (mixed)", () => {
//       const code =
//         "const arr = [function a(){}, () => {}, async function b(){}];";
//       expect(namesFrom(code)).toEqual(["a", undefined, "b"]);
//     });
//   });

//   describe("overloads & implementation nuances", () => {
//     test("exported overloads collapse to implementation", () => {
//       const code = `
//         export function foo(a: string): void;
//         export function foo(a: number): void;
//         export function foo(a: any): void {}
//       `;
//       expect(namesFrom(code)).toEqual(["foo"]);
//     });

//     test("method overloads (class) collapse to one implementation", () => {
//       const code = `
//         class C {
//           m(a: string): void;
//           m(a: number): void;
//           m(a: any): void {}
//         }
//       `;
//       expect(namesFrom(code)).toEqual(["m"]);
//     });
//   });

//   describe("misc small gaps", () => {
//     test("arrow nested returning arrow (deeper)", () => {
//       const code = "const a = () => () => () => {};";
//       // First is bound name, inner arrows are anonymous
//       expect(namesFrom(code)).toEqual(["a", undefined, undefined]);
//     });

//     test("function expression nested in arrow body", () => {
//       const code = `
//         const a = () => {
//           return function inner() {};
//         };
//       `;
//       expect(namesFrom(code)).toEqual(["a", "inner"]);
//     });

//     test("object literal method + inner nested", () => {
//       const code = `
//         const o = {
//           m() {
//             const x = function y() {};
//             (() => {})();
//           }
//         };
//       `;
//       expect(namesFrom(code)).toEqual(["m", "y", undefined]);
//     });
//   });

//   describe("misc small gaps", () => {
//     test("object method identifier + computed string nested", () => {
//       const code = `
//       const o = {
//         a() {
//           const inner = {
//             ["x-y"]() {},
//             b() {}
//           };
//           (() => {})(); // anonymous IIFE (should be undefined)
//           class C {
//             m() {}
//             ["p-q"]() {}
//           }
//         },
//         ["w-z"]() {}
//       };
//     `;
//       // Expect: a (method), "\"x-y\"" (string literal with quotes), b (method),
//       // undefined (IIFE arrow), m (class method), "\"p-q\"" (string literal with quotes), "\"w-z\""
//       expect(namesFrom(code)).toEqual([
//         "a",
//         '"x-y"',
//         "b",
//         undefined,
//         "m",
//         '"p-q"',
//         '"w-z"',
//       ]);
//     });

//     test("deeper nesting: class inside method, inner class with computed string", () => {
//       const code = `
//       const o = {
//         outer() {
//           class A {
//             ["u-v"]() {
//               class B {
//                 n() {}
//                 ["r-s"]() {}
//               }
//               (() => {})(); // anonymous arrow inside method body
//             }
//           }
//         }
//       };
//     `;
//       // Expect: outer (method), "\"u-v\"" (string literal with quotes),
//       // n (method), "\"r-s\"" (string literal with quotes), undefined (IIFE)
//       expect(namesFrom(code)).toEqual([
//         "outer",
//         '"u-v"',
//         "n",
//         '"r-s"',
//         undefined,
//       ]);
//     });
//   });
// });

// describe("more edge cases", () => {
//   test("arrow function inside array destructuring default", () => {
//     const code = "const [a = () => {}] = [];";
//     expect(namesFrom(code)).toEqual([undefined]);
//   });

//   test("object destructuring with nested arrow default", () => {
//     const code = "const { x: y = () => {} } = {};";
//     expect(namesFrom(code)).toEqual([undefined]);
//   });

//   test("async arrow as a class field", () => {
//     const code = `
//       class C {
//         m = async () => {};
//       }
//     `;
//     expect(namesFrom(code)).toEqual(["m"]);
//   });

//   test("generator default export (anonymous)", () => {
//     const code = "export default function* () {}";
//     expect(namesFrom(code)).toEqual([undefined]);
//   });

//   test("generator default export (named)", () => {
//     const code = "export default function* run() {}";
//     expect(namesFrom(code)).toEqual(["run"]);
//   });

//   test("nested namespace functions", () => {
//     const code = `
//       namespace Outer {
//         export function a() {}
//         namespace Inner {
//           export function b() {}
//         }
//       }
//     `;
//     expect(namesFrom(code)).toEqual(["a", "b"]);
//   });

//   test("getter/setter overload collapse", () => {
//     const code = `
//       class C {
//         get x(): number { return 1; }
//         set x(v: number) {}
//       }
//     `;
//     // Depending on your extractor you may see ["x","x"], or just ["x"] if collapsed.
//     expect(namesFrom(code)).toEqual(["x", "x"]);
//   });

//   test("static async arrow class field", () => {
//     const code = `
//       class C {
//         static m = async () => {};
//       }
//     `;
//     expect(namesFrom(code)).toEqual(["m"]);
//   });

//   test("function inside enum initializer", () => {
//     const code = `
//       enum E {
//         A = (() => { return 1 })(),
//       }
//     `;
//     expect(namesFrom(code)).toEqual([undefined]);
//   });

//   test("function inside type assertion", () => {
//     const code = `
//       const f = (<any>(function named() {}));
//     `;
//     expect(namesFrom(code)).toEqual(["named"]);
//   });
// });


  describe("overloads & implementation nuances", () => {
    test("exported overloads collapse to implementation", () => {
      const code = `
            const myFunc = x = z = () => {
      (() => {
        const innerFunc = () => {
          (() => {
            console.log("deeply nested");
          })();
        };
        innerFunc();
      })();
    };
    `;
      expect(namesFrom(code)).toEqual([undefined, undefined, "innerFunc" , undefined]);
    });
  });
  


describe("bindings & assignments (var/let/etc.)", () => {
  // test("var single declarator", () => {
  //   const code = "var a = () => {};";
  //   expect(namesFrom(code)).toEqual(["a"]);
  // });

  // test("let single declarator", () => {
  //   const code = "let a = () => {};";
  //   expect(namesFrom(code)).toEqual(["a"]);
  // });

  // test("let multi-declarator is ambiguous", () => {
  //   const code = "let a = () => {}, b = () => {}, c = function named() {};";
  //   expect(namesFrom(code)).toEqual([undefined, undefined, "named"]);
  // });

  test("var multi-declarator is ambiguous", () => {
    const code = "var a = () => {}, b = () => {};";
    expect(namesFrom(code)).toEqual(["a", "b"]);
  });

  // test("chained assignment in initializer (last LHS wins)", () => {
  //   const code = "let x = y = z = () => {};";
  //   expect(namesFrom(code)).toEqual([undefined]);
  // });

  // test("bare assignments (no declaration)", () => {
  //   const code = "x = () => {}, y = () => {};";
  //   expect(namesFrom(code)).toEqual([undefined, undefined]);
  // });

  // test("object literal: arrow vs method", () => {
  //   const code = "const o = { a: () => {}, b() {} };";
  //   expect(namesFrom(code)).toEqual(["a", "b"]);
  // });

  // test("class field (arrow) and method", () => {
  //   const code = "class C { m = () => {}; n() {} }";
  //   expect(namesFrom(code)).toEqual(["m", "n"]);
  // });

  // test("destructuring default has no binding", () => {
  //   const code = "const { m = () => {} } = {} as any;";
  //   expect(namesFrom(code)).toEqual([undefined]);
  // });


  test("nested + chained assignment (your pattern)", () => {
    const code = `
      const myFunc = x = z = () => {
        (() => {
          const innerFunc = () => {
            (() => { /* iife */ })();
          })();
        innerFunc();
      };
    `;
    expect(namesFrom(code)).toEqual([undefined, undefined, "innerFunc", undefined]);
  });
});
