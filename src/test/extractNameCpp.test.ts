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
    expect(namesFrom(code)).toEqual(["add", "Miner::calculate_hash_code"]);
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
    expect(namesFrom(code)).toEqual(["A::A", "A::~A", "A::foo"]);
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
    expect(namesFrom(code)).toEqual(["square", "~X"]);
  });
});

/* ================================
   LAMBDAS & CAPTURES
================================ */
describe("C++: lambdas & captures", () => {
  test("lambda assigned to variable", () => {
    const code = "auto fn = [&](int v){ return v + 1; };";
    expect(namesFrom(code)).toEqual(["fn"]);
  });

  test("immediately-invoked lambda (IIFE style)", () => {
    const code = "[](){ return 42; }();";
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
    const code = "template <typename T> T add(T a, T b) { return a + b; }";
    expect(namesFrom(code)).toEqual(["add"]);
  });

  test("class template method (out-of-class)", () => {
    const code = `
      template <typename T> struct Box { void put(T); };
      template <typename T> void Box<T>::put(T) {}
    `;
    expect(namesFrom(code)).toEqual(["Box<T>::put"]);
  });

  test("explicit specialization", () => {
    const code = `
      template <typename T> struct A { static void m(); };
      template <> void A<int>::m() {}
    `;
    expect(namesFrom(code)).toEqual(["A<int>::m"]);
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
    expect(namesFrom(code)).toEqual(["Outer<int>::Inner<double>::f"]);
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
    expect(namesFrom(code)).toEqual(["A<T>::g"]);
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

// problem with QualConv::operator bool() const { return true; }
describe("C++: advanced functions", () => {
  test("functions with crazy declarators", () => {
    const code = `
      int*&   ref_to_ptr_global()   { static int v=42; static int* p=&v; static int*& r=p; return r; }
      int**   ptr_to_ptr_global()   { static int v=5;  static int* p=&v; static int** pp=&p; return pp; }
      int***  ptr_to_ptr_to_ptr()   { static int v=1;  static int* p=&v; static int** pp=&p; return &pp; }

      int&    ref_to_array_elem()   { static int arr[3]={1,2,3}; return arr[1]; }
      int (*  ptr_to_array())[3]    { static int arr[3]={7,8,9}; return &arr; }
      int (&  ref_to_array())[3]    { static int arr[3]={10,11,12}; return arr; }

      int&&   rvalue_ref_global()   { static int v=2; return std::move(v); }
      const int& const_ref_global() { static int v=3; return v; }
      volatile int* volatile_ptr()  { static volatile int v=4; return &v; }
      const int*  const_ptr_global(){ static int v=5; return &v; }

      int (*  array_of_func_ptrs()[2])(int) {
        static int f1(int x){ return x+1; }
        static int f2(int x){ return x+2; }
        static int (*arr[2])(int)={f1,f2};
        return arr;
      }

      int (&  array_ref_func())[2]  { static int arr[2]={7,8}; return arr; }

      int (*  func_returns_funcptr())(int) { static int inner(int x){ return x*2; } return inner; }
      int (&  func_returns_funcref())(int) { static int impl(int x){ return x*3; } return impl; }

      int*    inner_return(int)      { static int v=77; return &v; }
      int* (* ptr_to_func_ret_ptr())(int) { return &inner_return; }

      int&    func_ref_impl(int& x)  { return x; }
      int (&  ref_to_func())(int&)   { return func_ref_impl; }

      struct PmfDemo {
        int f(int x){ return x+1; }
        int val;
      };
      int (PmfDemo::* ptr_to_memfunc())(int) { return &PmfDemo::f; }
      int PmfDemo::* ptr_to_memvar()         { return &PmfDemo::val; }

      int     takes_func_ptr(int (*f)(int)) { return f(5); }
      int* (& ref_to_ptr_global2())()       { static int* p=nullptr; return p; }
      auto    auto_return_func() -> int*    { static int v=9; return &v; }

      int (*  complex_func(int (*f)(int)))(int) { return f; }

      // extras we were missing
      struct CtorDemo {
        CtorDemo() {}
        CtorDemo(int) {}
        ~CtorDemo() {}
        int operator[](int){ return 0; }
        int operator()(int){ return 0; }
      };

      struct OutCtor { OutCtor(); ~OutCtor(); };
      OutCtor::OutCtor() {}
      OutCtor::~OutCtor() {}

      void* operator new(unsigned long long) { return (void*)0; }
      void  operator delete(void*) noexcept {}

      namespace A { namespace B { void foo() {} }}
      template <typename T>
      T templated_func(T x) { return x; }

      // NEW: qualified leaf-name variants
      struct QualOps { int operator+(const QualOps&) const; int operator[](int) const; int operator()(int) const; };
      struct QualConv { operator bool() const; }

      int QualOps::operator+(const QualOps&) const { return 1; }
      int QualOps::operator[](int) const { return 0; }
      int QualOps::operator()(int) const { return 0; }
    `;

    expect(namesFrom(code)).toEqual([
      "ref_to_ptr_global",
      "ptr_to_ptr_global",
      "ptr_to_ptr_to_ptr",
      "ref_to_array_elem",
      "ptr_to_array",
      "ref_to_array",
      "rvalue_ref_global",
      "const_ref_global",
      "volatile_ptr",
      "const_ptr_global",
      "array_of_func_ptrs",
      "f1",
      "f2",
      "array_ref_func",
      "func_returns_funcptr",
      "inner",
      "func_returns_funcref",
      "impl",
      "inner_return",
      "ptr_to_func_ret_ptr",
      "func_ref_impl",
      "ref_to_func",
      "f",
      "ptr_to_memfunc",
      "ptr_to_memvar",
      "takes_func_ptr",
      "ref_to_ptr_global2",
      "auto_return_func",
      "complex_func",
      "CtorDemo",
      "CtorDemo",
      "~CtorDemo",
      "operator[]",
      "operator()",
      "OutCtor::OutCtor",
      "OutCtor::~OutCtor",
      "operator new",
      "operator delete",
      "foo",
      "templated_func",
      "QualOps::operator+",
      "QualOps::operator[]",
      "QualOps::operator()",
    ]);
  });
});

describe("C++: more function shapes", () => {
  test("lambdas only → no function_definition names", () => {
    const code = `
      auto L1 = [](){ return 1; };
      auto L2 = [](int x){ return x; };
      auto L3 = [p = 3]() mutable { p++; };
    `;
    expect(namesFrom(code)).toEqual(["L1", "L2", "L3"]);
  });

  test("trailing return types + cv/ref qualifiers + noexcept + constexpr", () => {
    const code = `
      struct Q {
        auto m1() -> int { return 1; }
        int  m2() const & noexcept { return 2; }
        int  m3() && { return 3; }
        constexpr int m4() const { return 4; }
      };
      auto free_trailing() -> int { return 0; }
    `;
    expect(namesFrom(code)).toEqual(["m1", "m2", "m3", "m4", "free_trailing"]);
  });

  test("function try-blocks (ctor + dtor)", () => {
    const code = `
      struct E {
        E() try { int x = 0; (void)x; } catch(...) {}
        ~E() try {} catch(...) {}
      };
    `;
    expect(namesFrom(code)).toEqual(["E", "~E"]);
  });

  test("defaulted/deleted (declarations only) → ignored", () => {
    const code = `
      struct D {
        D() = default;
        D(const D&) = delete;
      };
    `;
    expect(namesFrom(code)).toEqual(["D", "D"]);
  });

  test('linkage specs: extern "C" / extern "C++"', () => {
    const code = `
      extern "C"   int cfunc(){ return 1; }
      extern "C++" int cppfunc(){ return 2; }
    `;
    expect(namesFrom(code)).toEqual(["cfunc", "cppfunc"]);
  });

  test("more operators: =, <=>, ->*, comma, new[]/delete[]", () => {
    const code = `
      struct R {
        R&   operator=(const R&){ return *this; }
        auto operator<=>(const R&) const { return 0; }
        int  operator->*(int){ return 0; }
        int  operator,(int){ return 0; }
      };
      void* operator new[](unsigned long long){ return (void*)0; }
      void  operator delete[](void*) noexcept {}
    `;
    expect(namesFrom(code)).toEqual([
      "operator=",
      "operator<=>",
      "operator->*",
      "operator,",
      "operator new[]",
      "operator delete[]",
    ]);
  });

  // test("conversion operators to non-bool types", () => {
  //   const code = `
  //     #include <string>
  //     struct C {
  //       operator std::string() const { return {}; }
  //       operator long() const { return 0; }
  //     };
  //   `;
  //   expect(namesFrom(code)).toEqual(["operator std::string", "operator long"]);
  // });

  test("concepts + requires (template bodies)", () => {
    const code = `
      template<typename T>
      concept Addable = requires(T a){ a + a; };

      template<Addable T>
      T addT(T a){ return a + a; }

      template<typename T>
      auto h(T t) -> T requires (sizeof(T) > 0) { return t; }
    `;
    expect(namesFrom(code)).toEqual(["addT", "h"]);
  });

  test("attributes, decltype(auto), noexcept specs", () => {
    const code = `
      [[nodiscard]] int att(){ return 1; }
      decltype(auto) id(){ int x=0; return (x); }
      int nf() noexcept { return 0; }
      int nf2() noexcept(true) { return 0; }
    `;
    expect(namesFrom(code)).toEqual(["att", "id", "nf", "nf2"]);
  });
});

/* ================================
   CONVERSION OPERATORS (VARIANTS)
================================ */
describe("C++: conversion operators (edge cases)", () => {
  test("qualified conversion operator (out-of-class definition)", () => {
    const code = `
      struct QualConv { operator bool() const; };
      QualConv::operator bool() const { return true; }
    `;
    expect(namesFrom(code)).toEqual(["QualConv::operator bool"]);
  });

  test("explicit + ref-qualifiers + noexcept", () => {
    const code = `
      struct RQ {
        explicit operator int() & noexcept { return 0; }
        explicit operator const char*() && { return ""; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator int", "operator const char*"]);
  });

  test("template-dependent conversion target", () => {
    const code = `
      template<typename T>
      struct As { operator T() const { return T{}; } };
    `;
    expect(namesFrom(code)).toEqual(["operator T"]);
  });

  test("nested qualified conversion (Outer::Inner::operator long)", () => {
    const code = `
      struct Outer { struct Inner { operator long() const; }; };
      long Outer::Inner::operator long() const { return 1; }
    `;
    expect(namesFrom(code)).toEqual(["Outer::Inner::operator long"]);
  });

  test("conversion to pointer type", () => {
    const code = `
      struct P {
        operator int*() const { static int v=0; return &v; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator int*"]);
  });
});

/* ================================
   USER-DEFINED LITERALS (UDLs)
================================ */
describe("C++: user-defined literals", () => {
  test('integer UDL (operator "" _km)', () => {
    const code = `
      unsigned long long operator "" _km(unsigned long long n) { return n * 1000ULL; }
    `;
    expect(namesFrom(code)).toEqual(['operator "" _km']);
  });

  test('templated UDL (operator "" _tag)', () => {
    const code = `
      template<char... Cs>
      int operator "" _tag() { return sizeof...(Cs); }
    `;
    expect(namesFrom(code)).toEqual(['operator "" _tag']);
  });
});

/* ================================
   ADDITIONAL OPERATORS (UNIQUE)
================================ */
describe("C++: additional operators", () => {
  test("arrow operator", () => {
    const code = `
      struct PtrLike {
        PtrLike* operator->() { return this; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator->"]);
  });

  test("prefix/postfix ++/-- (distinct overloads)", () => {
    const code = `
      struct Inc {
        Inc& operator++() { return *this; }      // prefix
        Inc  operator++(int) { return *this; }   // postfix
        Inc& operator--() { return *this; }      // prefix
        Inc  operator--(int) { return *this; }   // postfix
      };
    `;
    expect(namesFrom(code)).toEqual([
      "operator++",
      "operator++",
      "operator--",
      "operator--",
    ]);
  });

  test("unary/binary bitwise, shifts, logical-not", () => {
    const code = `
      struct Ops {
        int  operator~() const { return 0; }
        bool operator!() const { return false; }
        Ops  operator&(const Ops&) const { return {}; }
        Ops  operator|(const Ops&) const { return {}; }
        Ops  operator^(const Ops&) const { return {}; }
        Ops  operator<<(int) const { return {}; }
        Ops  operator>>(int) const { return {}; }
      };
    `;
    expect(namesFrom(code)).toEqual([
      "operator~",
      "operator!",
      "operator&",
      "operator|",
      "operator^",
      "operator<<",
      "operator>>",
    ]);
  });

  test("address-of and dereference as members", () => {
    const code = `
      struct FancyPtr {
        FancyPtr* operator&() { return this; }
        int& operator*() { static int v = 0; return v; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator&", "operator*"]);
  });
});

/* ================================
   FRIEND & STREAM OPERATORS
================================ */
describe("C++: friend & stream operators", () => {
  test("friend operator== inline inside class", () => {
    const code = `
      struct S2 {
        int x;
        friend bool operator==(const S2& a, const S2& b) { return a.x == b.x; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator=="]);
  });

  test("friend declared in class, defined out-of-class (operator+ and operator<<)", () => {
    const code = `
      #include <ostream>
      struct S {
        int x;
        friend S operator+(S a, S b);
        friend std::ostream& operator<<(std::ostream& os, const S& s);
      };
      S operator+(S a, S b) { return {a.x + b.x}; }
      std::ostream& operator<<(std::ostream& os, const S& s) { return os; }
    `;
    expect(namesFrom(code)).toEqual(["operator+", "operator<<"]);
  });
});

/* ===============================================
   MEMORY MGMT OPS: PLACEMENT / ALIGNED / SIZED
================================================ */
describe("C++: memory management operators (placement/aligned/sized)", () => {
  test("placement new/delete", () => {
    const code = `
      #include <cstddef>
      void* operator new(std::size_t, void* p) noexcept { return p; }
      void  operator delete(void*, void*) noexcept {}
    `;
    expect(namesFrom(code)).toEqual(["operator new", "operator delete"]);
  });

  test("aligned new/delete", () => {
    const code = `
      #include <new>
      #include <cstddef>
      void* operator new(std::size_t sz, std::align_val_t) { return ::operator new(sz); }
      void  operator delete(void* p, std::align_val_t) noexcept {}
    `;
    expect(namesFrom(code)).toEqual(["operator new", "operator delete"]);
  });

  test("sized delete / sized delete[]", () => {
    const code = `
      #include <cstddef>
      void operator delete(void* p, std::size_t) noexcept {}
      void operator delete[](void* p, std::size_t) noexcept {}
    `;
    expect(namesFrom(code)).toEqual(["operator delete", "operator delete[]"]);
  });
});

/* ================================
   USER-DEFINED LITERALS (MORE)
================================ */
describe("C++: user-defined literals (more forms)", () => {
  test('floating UDL', () => {
    const code = `
      long double operator "" _deg(long double d) { return d; }
    `;
    expect(namesFrom(code)).toEqual(['operator "" _deg']);
  });

  test('raw UDL with (const char*, size_t)', () => {
    const code = `
      #include <cstddef>
      const char* operator "" _raw(const char* s, std::size_t n) { return s; }
    `;
    expect(namesFrom(code)).toEqual(['operator "" _raw']);
  });

  test('namespace-scoped UDL', () => {
    const code = `
      namespace L {
        unsigned long long operator "" _id(unsigned long long n) { return n; }
      }
    `;
    expect(namesFrom(code)).toEqual(['operator "" _id']);
  });
});

/* ===========================================
   CALL OPERATOR: TEMPLATES & CONSTRAINTS
=========================================== */
describe("C++: call operator templates & constraints", () => {
  test("templated operator()", () => {
    const code = `
      struct Fun {
        template<typename T>
        int operator()(T) const { return 0; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator()"]);
  });

  test("requires-constrained operator+ (free template)", () => {
    const code = `
      template<typename T>
      concept Addable = requires(T a){ a + a; };

      template<typename T> struct Vec { T v; };

      template<Addable T>
      Vec<T> operator+(Vec<T> a, Vec<T> b) { return {a.v + b.v}; }
    `;
    expect(namesFrom(code)).toEqual(["operator+"]);
  });

  test("operator() with ref-qualifier and noexcept", () => {
    const code = `
      struct Callable {
        int operator()() & noexcept { return 1; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator()"]);
  });
});

/* ================================
   COROUTINES: OPERATOR CO_AWAIT
================================ */
describe("C++: coroutines operator", () => {
  test("operator co_await as member", () => {
    const code = `
      struct Awaiter {
        bool await_ready() noexcept { return true; }
        void await_suspend(int) noexcept {}
        void await_resume() noexcept {}
      };
      struct Holder {
        Awaiter operator co_await() noexcept { return {}; }
      };
    `;
    expect(namesFrom(code)).toEqual([
      "await_ready",
      "await_suspend",
      "await_resume",
      "operator co_await",
    ]);
  });
});

/* ======================================
   QUALIFIED OPERATOR DEFINITIONS
====================================== */
describe("C++: qualified operator definitions", () => {
  test("nested class out-of-class operator()", () => {
    const code = `
      struct Outer { struct Fn { int operator()(int); }; };
      int Outer::Fn::operator()(int){ return 0; }
    `;
    expect(namesFrom(code)).toEqual(["Outer::Fn::operator()"]);
  });

  test("operator* with trailing return type", () => {
    const code = `
      struct It {
        int v;
        auto operator*() -> int& { return v; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator*"]);
  });

  test("operator() with attributes", () => {
    const code = `
      struct AttrCall {
        [[nodiscard]] int operator()(int x) const { return x; }
      };
    `;
    expect(namesFrom(code)).toEqual(["operator()"]);
  });
});