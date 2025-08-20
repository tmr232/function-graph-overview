import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

/**
 * Helper
 */
const namesFrom = (code: string) =>
  [...iterFunctions(code, "C++")].map((f) => extractFunctionName(f, "C++"));

/* ================================
   BASIC FUNCTIONS
================================ */
describe("C++: basic functions", () => {
  test("free functions (qualified and unqualified)", () => {
    const code = `
      int add(int a, int b) { return a + b; }
      unsigned int Miner::calculate_hash_code() {}
    `;
    expect(namesFrom(code)).toEqual(["add", "calculate_hash_code"]);
  });

  test("namespaces", () => {
    const code = `
      namespace A {
        void f() {}
        namespace B {
          int g() { return 1; }
        }
      }
    `;
    expect(namesFrom(code)).toEqual(["f", "g"]);
  });
});

/* ================================
   MEMBER FUNCTIONS & SPECIAL MEMBERS
================================ */
describe("C++: class/struct methods and special members", () => {
  test("in-class definitions: ctor, dtor, method, static method", () => {
    const code = `
      struct C {
        C() {}
        ~C() {}
        void m() {}
        static int sm() { return 0; }
      };
    `;
    expect(namesFrom(code)).toEqual(["C", "~C", "m", "sm"]);
  });

  test("out-of-class definitions (qualified)", () => {
    const code = `
      struct A { A(); ~A(); void foo(); };
      A::A() {}
      A::~A() {}
      void A::foo() {}
    `;
    expect(namesFrom(code)).toEqual(["A", "~A", "foo"]);
  });

  test("operator overloads (member and free)", () => {
    const code = `
      struct V {
        int x;
        V operator+(const V& other) const { return {x + other.x}; }
        V& operator+=(const V& other) { x += other.x; return *this; }
      };
      V operator-(const V& a, const V& b) { return {a.x - b.x}; }
    `;
    expect(namesFrom(code)).toEqual(["operator+", "operator+=", "operator-"]);
  });

  test("call operator and conversion operator", () => {
    const code = `
      struct F {
        int operator()(int v) const { return v; }
        operator bool() const { return true; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator()", "operator bool"]);
  });

  test("local class inside function (ignore class dtor)", () => {
    const code = `
      int square(int num) {
        class X { ~X() {} };
        return num * num;
      }
    `;
    expect(namesFrom(code)).toEqual(["square"]);
  });
});

/* ================================
   LAMBDAS & CAPTURES
================================ */
describe("C++: lambdas & captures", () => {
  test("lambda assigned to variable", () => {
    const code = `auto fn = [&](int v){ return v + 1; };`;
    expect(namesFrom(code)).toEqual(["fn"]);
  });

  test("immediately-invoked lambda (IIFE style)", () => {
    const code = `[](){ return 42; }();`;
    expect(namesFrom(code)).toEqual(["<anonymous>"]);
  });

  test("generic/mutable/noexcept flavors", () => {
    const code = `
      auto g = [](auto x){ return x; };
      auto m = [=]() mutable { };
      auto a = []() noexcept { };
    `;
    expect(namesFrom(code)).toEqual(["g", "m", "a"]);
  });

  test("lambda nested inside named lambda", () => {
    const code = `
      void f() {
        auto my_func = [](){
          [](){}();
        };
      }
    `;
    expect(namesFrom(code)).toEqual(["f", "my_func", "<anonymous>"]);
  });
});

/* ================================
   ASSIGNMENTS & INITIALIZERS
================================ */
describe("C++: assignments & initializers", () => {
  test("declaration then assignment", () => {
    const code = `
      #include <functional>
      std::function<void()> f;
      f = [](){};
    `;
    expect(namesFrom(code)).toEqual(["f"]);
  });

  test("chained assignment chooses nearest binder", () => {
    const code = `
      #include <functional>
      std::function<void()> b;
      auto a = (b = [](){});
    `;
    expect(namesFrom(code)).toEqual(["b"]);
  });

  test("member assignment (field_expression on LHS)", () => {
    const code = `
      #include <functional>
      struct S { std::function<void()> fn; };
      S s;
      s.fn = [](){};
    `;
    expect(namesFrom(code)).toEqual(["s.fn"]);
  });

  test("static data member assignment with scope resolution", () => {
    const code = `
      #include <functional>
      struct T { static std::function<void()> fn; };
      std::function<void()> T::fn = [](){};
    `;
    expect(namesFrom(code)).toEqual(["T::fn"]);
  });
});

/* ================================
   CONTAINERS & CALLBACKS
================================ */
describe("C++: containers & callbacks", () => {
  test("lambdas in initializer lists (vector)", () => {
    const code = `
      #include <vector>
      #include <functional>
      std::vector<std::function<void()>> v{ [](){}, [](){} };
    `;
    expect(namesFrom(code)).toEqual(["<anonymous>", "<anonymous>"]);
  });

  test("algorithm callback", () => {
    const code = `
      #include <algorithm>
      #include <vector>
      std::vector<int> xs{1,2,3};
      std::for_each(xs.begin(), xs.end(), [](int){});
    `;
    expect(namesFrom(code)).toEqual(["<anonymous>"]);
  });

  test("map with function values", () => {
    const code = `
      #include <map>
      #include <functional>
      std::map<int, std::function<void()>> m{
        {1, [](){}},
        {2, [](){}}
      };
    `;
    expect(namesFrom(code)).toEqual(["<anonymous>", "<anonymous>"]);
  });

  test("new/delete/sizeof/decltype contexts", () => {
    const code = `
      auto p = new auto([](){});
      delete [](){};
      sizeof([](){});
      decltype([](){}) *t = nullptr;
    `;
    expect(namesFrom(code)).toEqual([
      "<anonymous>",
      "<anonymous>",
      "<anonymous>",
      "<anonymous>",
    ]);
  });
});

/* ================================
   TEMPLATES & SPECIALIZATION
================================ */
describe("C++: templates & specialization", () => {
  test("function template", () => {
    const code = `template <typename T> T add(T a, T b) { return a + b; }`;
    expect(namesFrom(code)).toEqual(["add"]);
  });

  test("class template method (out-of-class)", () => {
    const code = `
      template <typename T> struct Box { void put(T); };
      template <typename T> void Box<T>::put(T) {}
    `;
    expect(namesFrom(code)).toEqual(["put"]);
  });

  test("explicit specialization", () => {
    const code = `
      template <typename T> struct A { static void m(); };
      template <> void A<int>::m() {}
    `;
    expect(namesFrom(code)).toEqual(["m"]);
  });
});

/* ================================
   CONTROL FLOW & EXPRESSIONS
================================ */
describe("C++: control flow & expressions", () => {
  test("lambdas in control flow", () => {
    const code = `
      if ( [](){ return true; }() ) {}
      while ( [](){ return false; }() ) {}
      switch ( [](){ return 0; }() ) { default: break; }
      for (int i = [](){ return 0; }(); i < 1; ++i) {}
    `;
    expect(namesFrom(code)).toEqual([
      "<anonymous>",
      "<anonymous>",
      "<anonymous>",
      "<anonymous>",
    ]);
  });

  test("returning a lambda from a function", () => {
    const code = `
      auto factory() {
        return [](){};
      }
    `;
    expect(namesFrom(code)).toEqual(["factory", "<anonymous>"]);
  });

  test("ternary with two lambdas (both anonymous, assigned to a variable)", () => {
    const code = `
      bool cond = true;
      auto f = cond ? [](){} : [](){};
    `;
    expect(namesFrom(code)).toEqual(["<anonymous>", "<anonymous>"]);
  });
});

/* ================================
   NESTED TEMPLATES & EXPRESSION CONTEXTS (TEC)
================================ */
describe("C++: nested templates & expression contexts (TEC)", () => {
  test("nested class template with method (out-of-class def + full specialization)", () => {
    const code = `
      template<typename T>
      struct Outer {
        template<typename U>
        struct Inner {
          static void f();
        };
      };

      template<>
      template<>
      void Outer<int>::Inner<double>::f() {}
    `;
    expect(namesFrom(code)).toEqual(["f"]);
  });

  test("class template with nested method template (generic out-of-class def)", () => {
    const code = `
      template<typename T>
      struct A {
        template<typename U>
        void g();
      };

      template<typename T>
      template<typename U>
      void A<T>::g() {}
    `;
    expect(namesFrom(code)).toEqual(["g"]);
  });

  test("function template with local lambdas (bound via names)", () => {
    const code = `
      template<typename T>
      T apply(T v) {
        auto inc = [](T x){ return x + 1; };
        auto wrapper = [=](){ return inc(v); };
        return wrapper();
      }
    `;
    expect(namesFrom(code)).toEqual(["apply", "inc", "wrapper"]);
  });

  test("lambda inside capture-init of an outer lambda (nested capture)", () => {
    const code = `
      auto outer = [n = [](){ return 42; }()](){};
    `;
    expect(namesFrom(code)).toEqual(["outer", "<anonymous>"]);
  });

  test("nested invocation chain: lambda inside template call", () => {
    const code = `
      #include <functional>
      template<typename F>
      void call(F f){ f(); }

      void use() {
        call([](){});
      }
    `;
    expect(namesFrom(code)).toEqual(["call", "use", "<anonymous>"]);
  });

  test("namespace + template + nested class + method + inner lambda", () => {
    const code = `
      namespace N {
        template<typename T>
        struct Box {
          struct Runner {
            void run() {
              [](){}();
            }
          };
        };
      }
    `;
    expect(namesFrom(code)).toEqual(["run", "<anonymous>"]);
  });
});
