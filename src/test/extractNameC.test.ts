import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/cfg.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

const namesFrom = (code: string) =>
  [...iterFunctions(code, "C")].map((f) => extractFunctionName("C", f));
describe("C: function name extraction", () => {
  test.each([
    [
      "simple top-level function definition",
      "int add(int a, int b) { return a + b; }",
      ["add"],
    ],
    [
      "static inline function definition",
      "static inline double square(double x) { return x * x; }",
      ["square"],
    ],
    [
      "multiple functions defined on one line",
      "void start() {} void stop() {} void reset() {};",
      ["start", "stop", "reset"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C: (GNU extension) nested functions", () => {
  test.each([
    [
      "single nested function inside another function",
      `
        void outer() {
          int inner(int x) { return x + 1; }
          inner(5);
        }
      `,
      ["outer", "inner"],
    ],
    [
      "multiple levels of nested functions",
      `
        void top() {
          void mid() {
            void bottom() {}
            void bottom2() {}
            bottom();
            bottom2();
          }
          mid();
        }
      `,
      ["top", "mid", "bottom", "bottom2"],
    ],
    [
      "nested functions declared inside conditional branches",
      `
        void check(int flag) {
          if (flag) {
            void innerA() {}
            innerA();
          } else {
            void innerB() {}
            innerB();
          }
        }
      `,
      ["check", "innerA", "innerB"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C: functions returning function pointers", () => {
  test.each([
    [
      "recurse returns its function pointer argument",
      `
        int add(int a, int b) { return a + b; }
        int (*recurse(int (*f)(int, int)))(int, int) { return f; }
        int main(void) { return recurse(add)(2, 3); }
      `,
      ["add", "recurse", "main"],
    ],
    [
      "select_op returns one of two function pointers",
      `
        int add(int a, int b) { return a + b; }
        int sub(int a, int b) { return a - b; }
        int (*select_op(int t))(int, int) { return t ? add : sub; }
        int main(void) { return select_op(0)(5, 5); }
      `,
      ["add", "sub", "select_op", "main"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});
