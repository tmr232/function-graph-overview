import { describe, expect, test } from "vitest";
import { extractFunctionName, extractTaggedValueFromTreeSitterQuery } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

// test("arrow_function with variable", () => {
//     const code = "const returnInArray = <T,>(value: T): T[] => {};";
//     const funcIterator = iterFunctions(code, "TypeScript");
//     const func = funcIterator.next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe("returnInArray");
//   });

//  test("function_declaration", () => {
//     const code = "export function getStatementHandlers(): StatementHandlers {}";
//     const funcIterator = iterFunctions(code, "TypeScript");
//     const func = funcIterator.next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe(
//       "getStatementHandlers",
//     );
//   });

// test("arrow_function with no parent", () => {
//     const code = "<T,>(value: T): T[] => {};";
//     const funcIterator = iterFunctions(code, "TypeScript");
//     const func = funcIterator.next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
//   });



//   test("arrow functions assigned to multiple variables", () => {
//     const code = "let x = () => {}, y = () => {}, s = () => {};";
//     const funcIterator = iterFunctions(code, "TypeScript");
//     const next = funcIterator.next();
//     const func = next.value;
//     expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
//   });


//  test("method_definition", () => {
//     const code =
//       "class SmartPhone { setPrice(smartPhonePrice: number) : void {} }";
//     const funcIterator = iterFunctions(code, "TypeScript");
//     const func = funcIterator.next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe("setPrice");
//   });
 
 
//    test("function_expression with variable", () => {
//     const code = "const myFunction = function(name1: string): string {};";
//     const funcIterator = iterFunctions(code, "TypeScript");
//     const func = funcIterator.next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe("myFunction");
//   });
  
  
//   //  function_expression
//   test("function_expression with direct name", () => {
//     const code = "const sum = function add(): number {};";
//     const funcIterator = iterFunctions(code, "TypeScript");
//     const func = funcIterator.next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe("add");
//   });


//     test("function_expression with no variable", () => {
//     const code = "function(name1: string): string {};";
//     const funcIterator = iterFunctions(code, "TypeScript");
//     const func = funcIterator.next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
//   });


//       test("generator_function with variable", () => {
//     const code = "const fn = function* myGenerator<T>(input: T): Generator<number> {};";
//     const funcIterator = iterFunctions(code, "TypeScript");
//     const func = funcIterator.next().value;
//     expect(extractFunctionName(func, "TypeScript")).toBe("myGenerator");
//   });

//   test("anonymous arrow inside named arrow", () => {
//   const code = `const outer , x = <T,>(value: T): T[] => {
//     (() => {
//       console.log(value);
//     })();
//     return [value];
//   };`;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     //console.log(func.type);
//     return extractFunctionName(func, "TypeScript");
//   });
//   const expectedNames = [undefined, undefined];
//   expect(foundNames).toEqual(expectedNames);
// });


// test("anonymous arrow inside named arrow", () => {
//   const code = `
//   function f() {
//     const myFunc = () => {
//       (() => {
//         const innerFunc = () => {
//           (() => {
//             console.log("deeply nested");
//           })();
//         };
//         innerFunc();
//         function x() {}
//       })();
//     };
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f","myFunc", undefined, "innerFunc", undefined, "x"];
//   expect(foundNames).toEqual(expectedNames);

// });


// test("anonymous arrow inside named arrow", () => {
//     const code = `
//   function f() {
//     function x() {}
//     function y() {}
//     function z() {}
//     function d() {}
//     function k() {}
//     function b() {
//       function o() {}
//       function p() {}
//       function o() {}
//     }
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });

//   const expectedNames = [
//     "f",
//     "x",
//     "y",
//     "z",
//     "d",
//     "k",
//     "b",
//     "o",
//     "p",
//     "o",
//   ];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("multiple declarators in one statement", () => {
//   const code = `
//   function f() {
//     let x = () => {}, y = () => {}, s = () => {};
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", undefined, undefined, undefined];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("assignment expression after declaration", () => {
//   const code = `
//   function f() {
//     let x;
//     x = () => {};
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", "x"];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("named arrow + anonymous IIFE", () => {
//   const code = `
//   function f() {
//     const g = () => {};
//     (() => {})();
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", "g", undefined];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("nested function declaration with inner arrow", () => {
//   const code = `
//   function f() {
//     const myFunc = () => {
//       function x() { const a = () => {}; }
//     };
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", "myFunc", "x", "a"];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("async arrow function", () => {
//   const code = `
//   function f() {
//     const a = async () => {};
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", "a"];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("arrow with expression body and block body", () => {
//   const code = `
//   function f() {
//     const b = n => n + 1;
//     const c = () => { return 1; };
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", "b", "c"];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("anonymous arrow IIFE with argument", () => {
//   const code = `
//   function f() {
//     ((arg => arg * 2))(21);
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", undefined];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("generator and normal function declarations", () => {
//   const code = `
//   function f() {
//     function g() {}
//     function* h() {}
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", "g", "h"];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("assignment arrow + anonymous IIFE order", () => {
//   const code = `
//   function f() {
//     let run;
//     run = () => {};
//     (() => {})();
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", "run", undefined];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("arrow returning arrow (inner anonymous)", () => {
//   const code = `
//   function f() {
//     const a = () => () => {};
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", "a", undefined];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("mixed declarators: only arrows are functions", () => {
//   const code = `
//   function f() {
//     let x = 1, y = () => {}, z = 2;
//   }
//   `;

//   const funcIterator = iterFunctions(code, "TypeScript");
//   const foundNames = [...funcIterator].map((func) => {
//     return extractFunctionName(func, "TypeScript");
//   });
  
//   const expectedNames = ["f", undefined];
//   expect(foundNames).toEqual(expectedNames);
// });

// test("object literal method shorthand", () => {
//   const code = `
//   const o = {
//     run() {},
//     stop: 1
//   };
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   expect(foundNames).toEqual(["run"]);
// });

// test("object literal: arrow property and method", () => {
//   const code = `
//   const o = {
//     a: () => {},
//     b() {}
//   };
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   expect(foundNames).toEqual([undefined, "b"]);
// });

// test("computed method name in object (anonymous for extractor)", () => {
//   const code = `
//   const key = "m1";
//   const o = {
//     [key]() {}
//   };
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   // Most extractors won't resolve computed names -> undefined
//   expect(foundNames).toEqual([undefined]);
// });

// test("class static method and generator method", () => {
//   const code = `
//   class C {
//     static boot() {}
//     *g() {}
//   }
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   expect(foundNames).toEqual(["boot", "g"]);
// });

// test("class field with arrow (property initializer)", () => {
//   const code = `
//   class C {
//     m = () => {};
//     n = 1;
//   }
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   // If your extractor supports class fields -> "m"; otherwise keep undefined.
//   expect(foundNames).toEqual(["m"]);
// });

// test("export default named function", () => {
//   const code = `export default function main() {}`;
//   const func = iterFunctions(code, "TypeScript").next().value;
//   expect(extractFunctionName(func, "TypeScript")).toBe("main");
// });

// test("export default anonymous function", () => {
//   const code = `export default function () {}`;
//   const func = iterFunctions(code, "TypeScript").next().value;
//   expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
// });

// test("async function declaration", () => {
//   const code = `async function load() {}`;
//   const func = iterFunctions(code, "TypeScript").next().value;
//   expect(extractFunctionName(func, "TypeScript")).toBe("load");
// });

// test("async generator function declaration", () => {
//   const code = `async function* stream() {}`;
//   const func = iterFunctions(code, "TypeScript").next().value;
//   expect(extractFunctionName(func, "TypeScript")).toBe("stream");
// });

// test("named IIFE function expression", () => {
//   const code = `(function Boot() {})();`;
//   const func = iterFunctions(code, "TypeScript").next().value;
//   expect(extractFunctionName(func, "TypeScript")).toBe("Boot");
// });

// test("array literal contains arrow and named function expression", () => {
//   const code = `
//   const arr = [() => {}, function named() {}];
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   expect(foundNames).toEqual([undefined, "named"]);
// });

// test("conditional (ternary) with two anonymous arrows", () => {
//   const code = `
//   const f = true ? () => {} : () => {};
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   expect(foundNames).toEqual([undefined, undefined]);
// });

// test("reassignment to named function expression", () => {
//   const code = `
//   let x = 1;
//   x = function foo() {};
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   expect(foundNames).toEqual(["foo"]);
// });

// test("member assignment to arrow (likely anonymous)", () => {
//   const code = `
//   const o: any = {};
//   o.run = () => {};
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   // Unless you resolve MemberExpression left identifiers, keep undefined.
//   expect(foundNames).toEqual([undefined]);
// });

// test("arrow used as callback argument", () => {
//   const code = `
//   [1,2,3].map(n => n + 1);
//   `;
//   const func = iterFunctions(code, "TypeScript").next().value;
//   expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
// });

// test("function overloads collapse to single implementation name", () => {
//   const code = `
//   function foo(a: string): void;
//   function foo(a: number): void;
//   function foo(a: any): void {}
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   // Depending on your iterator, you may only see the implementation.
//   expect(foundNames).toEqual(["foo"]);
// });

// test("nested class method inside function", () => {
//   const code = `
//   function outer() {
//     class K { m() {} }
//   }
//   `;
//   const foundNames = [...iterFunctions(code, "TypeScript")].map(f =>
//     extractFunctionName(f, "TypeScript")
//   );
//   expect(foundNames).toEqual(["outer", "m"]);
// });

// test("generator in object literal", () => {
//   const code = `
//   const o = { *g() {} };
//   `;
//   const func = iterFunctions(code, "TypeScript").next().value;
//   expect(extractFunctionName(func, "TypeScript")).toBe("g");
// });

// test("arrow in destructuring default value", () => {
//   const code = `
//   const { m = () => {} } = {} as any;
//   `;
//   const func = iterFunctions(code, "TypeScript").next().value;
//   expect(extractFunctionName(func, "TypeScript")).toBe(undefined);
// });

test("deeply nested mix: declarators, IIFEs, inner declarations", () => {
  const code = `
  function f() {
    const a1 = () => {
      function b1() {
        const c1 = () => {
          (() => {
            function d1() {}
          })();
        };
        c1();
        function b2() {
          const c2 = () => {
            (() => {})();
          };
          c2();
        }
      }
    };

    (() => {
      const x = () => {
        function y() {
          const z = () => {};
        }
      };
      x();
      function k() {}
    })();

    function top() {
      const inner = () => {
        (() => {
          function deep() {}
        })();
      };
      inner();
    }

    const trailing = () => {};
  }
  `;

  const funcIterator = iterFunctions(code, "TypeScript");
  const foundNames = [...funcIterator].map((func) => {
    return extractFunctionName(func, "TypeScript");
  });

  const expectedNames = [
    "f",
    "a1",
    "b1",
    "c1",
    undefined,   // IIFE inside c1
    "d1",
    "b2",
    "c2",
    undefined,   // IIFE inside c2
    undefined,   // outer IIFE wrapping x/k
    "x",
    "y",
    "z",
    "k",
    "top",
    "inner",
    undefined,   // IIFE inside inner
    "deep",
    "trailing",
  ];
  expect(foundNames).toEqual(expectedNames);
});
