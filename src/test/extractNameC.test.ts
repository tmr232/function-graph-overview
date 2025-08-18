import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

/**
 * Helpers
 */
const namesFrom = (code: string) =>
  [...iterFunctions(code, "C")].map((f) => extractFunctionName(f, "C"));

/* ================================
   UNIQUE FUNCTION EXTRACTION CASES
================================ */
describe("C: function name extraction", () => {
  test("basic definition", () => {
    const code = `int add(int a, int b) { return a + b; }`;
    expect(namesFrom(code)).toEqual(["add"]);
  });

  test("inline + static", () => {
    const code = `static inline double square(double x) { return x * x; }`;
    expect(namesFrom(code)).toEqual(["square"]);
  });

  test("function pointer assignment", () => {
    const code = `
      void handler() {}
      void (*fp)() = handler;
    `;
    expect(namesFrom(code)).toEqual(["handler"]);
  });

  test("typedef function pointer + definition", () => {
    const code = `
      typedef int (*cmp_t)(int, int);
      int compare(int a, int b) { return a - b; }
    `;
    expect(namesFrom(code)).toEqual(["compare"]);
  });

  test("struct with callback", () => {
    const code = `
      void init() {}
      struct C { void (*cb)(); } c = { init };
    `;
    expect(namesFrom(code)).toEqual(["init"]);
  });

  test("union with callback", () => {
    const code = `
      void shutdown() {}
      union U { void (*end)(); } u;
      u.end = shutdown;
    `;
    expect(namesFrom(code)).toEqual(["shutdown"]);
  });

  test("nested struct callback assignment", () => {
    const code = `
      void deep() {}
      struct Outer { struct Inner { void (*cb)(); } in; } outer;
      outer.in.cb = deep;
    `;
    expect(namesFrom(code)).toEqual(["deep"]);
  });

  test("recursive function", () => {
    const code = `int fact(int n) { return n <= 1 ? 1 : n * fact(n-1); }`;
    expect(namesFrom(code)).toEqual(["fact"]);
  });

  test("function passed to qsort", () => {
    const code = `
      int cmp(const void* a, const void* b) { return 0; }
      int main() { qsort(arr, n, sizeof(int), cmp); }
    `;
    expect(namesFrom(code)).toEqual(["cmp", "main"]);
  });

  test("block-scope static function", () => {
    const code = `
      int outer() {
        static int inner(int x) { return x + 1; }
        return inner(5);
      }
    `;
    expect(namesFrom(code)).toEqual(["outer", "inner"]);
  });

  test("multiple functions defined in one line", () => {
    const code = `
      void start() {} void stop() {} void reset() {}
    `;
    expect(namesFrom(code)).toEqual(["start", "stop", "reset"]);
  });

  test("duplicate function redefinition", () => {
    const code = `
      void ping() {}
      void ping() {}
    `;
    expect(namesFrom(code)).toEqual(["ping", "ping"]);
  });
});

/* ================================
   NESTED (GNU C EXTENSION)
================================ */
describe("C: nested functions (GNU C extension)", () => {
  test("single nested function", () => {
    const code = `
      void outer() {
        int inner(int x) { return x + 1; }
        inner(5);
      }
    `;
    expect(namesFrom(code)).toEqual(["outer", "inner"]);
  });

  test("multiple nested functions in same scope", () => {
    const code = `
      void container() {
        void first() {}
        void second() {}
        first(); second();
      }
    `;
    expect(namesFrom(code)).toEqual(["container", "first", "second"]);
  });

  test("deeply nested functions", () => {
    const code = `
      void top() {
        void mid() {
          void bottom() {}
          bottom();
        }
        mid();
      }
    `;
    expect(namesFrom(code)).toEqual(["top", "mid", "bottom"]);
  });

  test("nested function inside loop", () => {
    const code = `
      void runner(int n) {
        for (int i = 0; i < n; i++) {
          int loopfn(int x) { return x * i; }
          loopfn(i);
        }
      }
    `;
    expect(namesFrom(code)).toEqual(["runner", "loopfn"]);
  });

  test("nested function inside conditional", () => {
    const code = `
      void check(int flag) {
        if (flag) {
          void innerA() {}
          innerA();
        } else {
          void innerB() {}
          innerB();
        }
      }
    `;
    expect(namesFrom(code)).toEqual(["check", "innerA", "innerB"]);
  });
});
