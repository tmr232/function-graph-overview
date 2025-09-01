import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

const namesFrom = (code: string) =>
  [...iterFunctions(code, "C++")].map((f) => extractFunctionName(f, "C++"));

describe("C++: basic functions & namespaces", () => {
  test.each([
    [
      "free functions (qualified and unqualified)",
      `
      int add(int a, int b) { return a + b; }
      unsigned int Miner::calculate_hash_code() {}
      `,
      ["add", "Miner::calculate_hash_code"],
    ],
    [
      "namespaces",
      `
      namespace A {
        void f() {}
        namespace B {
          int g() { return 1; }
        }
      }
      `,
      ["f", "g"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: class/struct members & special members", () => {
  test.each([
    [
      "in-class: ctor, dtor, method, static method",
      `
      struct C {
        C() {}
        ~C() {}
        void m() {}
        static int sm() { return 0; }
      };
      `,
      ["C", "~C", "m", "sm"],
    ],
    [
      "out-of-class definitions (qualified)",
      `
      struct A { A(); ~A(); void foo(); };
      A::A() {}
      A::~A() {}
      void A::foo() {}
      `,
      ["A::A", "A::~A", "A::foo"],
    ],
    [
      "local class inside function (captures local dtor)",
      `
      int square(int num) {
        class X { ~X() {} };
        return num * num;
      }
      `,
      ["square", "~X"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: lambdas", () => {
  test.each([
    ["assigned to variable", "auto fn = [&](int v){ return v + 1; };", ["fn"]],
    ["immediately-invoked lambda", "[](){ return 42; }();", [undefined]],
    [
      "flavors: generic, mutable, noexcept",
      `
      auto g = [](auto x){ return x; };
      auto m = [=]() mutable { };
      auto a = []() noexcept { };
      `,
      ["g", "m", "a"],
    ],
    [
      "nested inside named lambda",
      `
      void f() {
        auto my_func = [](){ [](){}(); };
      }
      `,
      ["f", "my_func", undefined],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: assignments & initializers", () => {
  test.each([
    [
      "declaration then assignment",
      `
      std::function<void()> f;
      f = [](){};
      `,
      ["f"],
    ],
    [
      "chained assignment chooses nearest binder",
      `
      std::function<void()> b;
      auto a = (b = [](){});
      `,
      ["b"],
    ],
    [
      "member assignment (field_expression on LHS)",
      `
      struct S { std::function<void()> fn; };
      S s;
      s.fn = [](){};
      `,
      ["s.fn"],
    ],
    [
      "static data member assignment with scope resolution",
      `
      struct T { static std::function<void()> fn; };
      std::function<void()> T::fn = [](){};
      `,
      ["T::fn"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: containers & expression contexts", () => {
  test.each([
    [
      "initializer list (vector) with lambdas",
      `
      std::vector<std::function<void()>> v{ [](){}, [](){} };
      `,
      [undefined, undefined],
    ],
    [
      "algorithm callback",
      `
      std::vector<int> xs{1,2,3};
      std::for_each(xs.begin(), xs.end(), [](int){});
      `,
      [undefined],
    ],
    [
      "new/sizeof/decltype with lambdas",
      `
      auto p = new auto([](){});
      sizeof([](){});
      decltype([](){}) *t = nullptr;
      `,
      [undefined, undefined, undefined],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: templates & specialization", () => {
  test.each([
    [
      "function template",
      "template <typename T> T add(T a, T b) { return a + b; }",
      ["add"],
    ],
    [
      "class template method (out-of-class)",
      `
      template <typename T> struct Box { void put(T); };
      template <typename T> void Box<T>::put(T) {}
      `,
      ["Box<T>::put"],
    ],
    [
      "explicit specialization (static method)",
      `
      template <typename T> struct A { static void m(); };
      template <> void A<int>::m() {}
      `,
      ["A<int>::m"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: control flow & ternaries with lambdas", () => {
  test.each([
    [
      "if/while/switch/for",
      `
      if ( [](){ return true; }() ) {}
      while ( [](){ return false; }() ) {}
      switch ( [](){ return 0; }() ) { default: break; }
      for (int i = [](){ return 0; }(); i < 1; ++i) {}
      `,
      [undefined, undefined, undefined, undefined],
    ],
    [
      "returning a lambda from a function",
      "auto factory() { return [](){}; }",
      ["factory", undefined],
    ],
    [
      "ternary with two lambdas",
      `
      bool cond = true;
      auto f = cond ? [](){} : [](){};
      `,
      [undefined, undefined],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: advanced declarators", () => {
  test.each([
    [
      "pointer/ref layering and arrays",
      `
      int*&   ref_to_ptr()   { static int v=42; static int* p=&v; static int*& r=p; return r; }
      int**   ptr_to_ptr()   { static int v=5;  static int* p=&v; static int** pp=&p; return pp; }
      int&    ref_to_array_elem() { static int arr[3]={1,2,3}; return arr[1]; }
      int (*  ptr_to_array())[3]  { static int arr[3]={1,2,3}; return &arr; }
      int (&  array_ref())[3]     { static int arr[3]={1,2,3}; return arr; }
      `,
      [
        "ref_to_ptr",
        "ptr_to_ptr",
        "ref_to_array_elem",
        "ptr_to_array",
        "array_ref",
      ],
    ],
    [
      "func pointers/refs + arrays of func ptrs",
      `
      int (* array_of_func_ptrs()[1])(int) {
        static int f(int x){ return x+1; }
        static int (*arr[1])(int)={f};
        return arr;
      }

      int (* func_returns_funcptr())(int) { static int inner(int x){ return x; } return inner; }
      int (& func_returns_funcref())(int) { static int impl(int x){ return x; } return impl; }

      int* (* ptr_to_func_ret_ptr())(int) { return nullptr; }

      int&  func_ref_impl(int& x)  { return x; }
      int (& ref_to_func())(int&)  { return func_ref_impl; }
      `,
      [
        "array_of_func_ptrs",
        "f",
        "func_returns_funcptr",
        "inner",
        "func_returns_funcref",
        "impl",
        "ptr_to_func_ret_ptr",
        "func_ref_impl",
        "ref_to_func",
      ],
    ],
    [
      "pointers-to-members and plumbing",
      `
      struct PmfDemo { int f(int); int val; };
      int (PmfDemo::* ptr_to_memfunc())(int) { return &PmfDemo::f; }
      int PmfDemo::* ptr_to_memvar()         { return &PmfDemo::val; }

      int  inner_return(int){ return 1; }
      int* (* ptr_to_func_ret_ptr())(int) { return &inner_return; }

      int     takes_func_ptr(int (*fp)(int)) { return fp(1); }
      auto    auto_return_func() -> int*     { static int v=0; return &v; }

      int (*  complex_func(int (*f)(int)))(int) { return f; }
      `,
      [
        "ptr_to_memfunc",
        "ptr_to_memvar",
        "inner_return",
        "ptr_to_func_ret_ptr",
        "takes_func_ptr",
        "auto_return_func",
        "complex_func",
      ],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: conversion operators", () => {
  test.each([
    [
      "in-class to bool",
      "struct C { operator bool() const {} };",
      ["operator bool"],
    ],
    [
      "qualified out-of-class",
      `
      struct Q { operator bool() const; };
      Q::operator bool() const {}
      `,
      ["Q::operator bool"],
    ],
    [
      "template-dependent target",
      `
      template<typename T>
      struct As { operator T() const { return T{}; } };
      `,
      ["operator T"],
    ],
    [
      "nested qualified conversion",
      `
      struct Outer { struct Inner { operator long() const; }; };
      long Outer::Inner::operator long() const { return 1; }
      `,
      ["Outer::Inner::operator long"],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: user-defined literals", () => {
  test.each([
    [
      "integer UDL",
      `unsigned long long operator "" _km(unsigned long long) {}`,
      ['operator "" _km'],
    ],
    [
      "templated UDL",
      `
      template<char... Cs>
      int operator "" _tag() { return sizeof...(Cs); }
      `,
      ['operator "" _tag'],
    ],
  ])("%s", (_title, code, expected) => {
    expect(namesFrom(code)).toEqual(expected);
  });
});

describe("C++: friend operator", () => {
  test("friend operator<< (decl + def)", () => {
    const code = `
      struct S { friend S& operator<<(S&, const S&); };
      S& operator<<(S&, const S&) {}
    `;
    expect(namesFrom(code)).toEqual(["operator<<"]);
  });
});

describe("C++: qualified operator definitions", () => {
  test("nested class operator()", () => {
    const code = `
      struct Outer { struct Fn { int operator()(int); }; };
      int Outer::Fn::operator()(int){}
    `;
    expect(namesFrom(code)).toEqual(["Outer::Fn::operator()"]);
  });
});
