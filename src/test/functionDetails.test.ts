import { describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { iterFunctions } from "../file-parsing/bun.ts";

// Go Tests
describe("Go", () => {
  test("function_declaration", () => {
    const code = "func main(){}";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value; // Extract the first function node
    expect(extractFunctionName(func, "Go")).toBe("main");
  });

  test("method_declaration", () => {
    const code =
      "func (l *Literal) Execute(writer io.Writer, data map[string]interface{}) core.ExecuteState {}";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Go")).toBe("Execute");
  });

  test("func_literal with no parent", () => {
    const code = "return func(x int) int {}";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Go")).toBe("<anonymous>");
  });

  test("func_literal assigned to variable", () => {
    const code = "isDebugInts := func(s string) bool {}";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Go")).toBe("isDebugInts");
  });

  test("multiple variable names from short var declaration", () => {
    const code = "y, x := func() {}, func() {}";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Go")).toBe("<unsupported>");
  });

  test("func_literal assigned to var with single identifier", () => {
    const code = "var x = func() {}";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Go")).toBe("x");
  });

  test("func_literal assigned without var keyword", () => {
    const code = "x = func() {}";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Go")).toBe("x");
  });

  test("func_literal assigned to multiple vars using 'var'", () => {
    const code = "var x, y = func() {}, func() {}";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Go")).toBe("<unsupported>");
  });

  test("nested function", () => {
    const code = "func outer() { func inner() {} inner() }";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Go")).toBe("outer");
  });

  test("nested short var", () => {
    const code = `func main() {
\tvar x = func() {
\t\ty := func() {}
\t\ty()
\t}
\tx()
}`;
    const funcIterator = iterFunctions(code, "Go");
    const foundNames = [...funcIterator].map((func) =>
      extractFunctionName(func, "Go"),
    );
    const expectedNames = ["main", "x", "y"];
    expect(foundNames).toContainEqual(expectedNames);
  });
});

// C Tests
describe("C", () => {
  test("function_definition", () => {
    const code = "static void tr_where (const void caller, Dl_infoinfo) {}";
    const funcIterator = iterFunctions(code, "C");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "C")).toBe("tr_where");
  });

  test("inline function", () => {
    const code = "inline int add(int a, int b) {}";
    const funcIterator = iterFunctions(code, "C");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "C")).toBe("add");
  });
});

// C++ Tests
describe("C++", () => {
  test("function_definition", () => {
    const code = "unsigned int Miner::calculate_hash_code() {}";
    const funcIterator = iterFunctions(code, "C++");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "C++")).toBe("calculate_hash_code");
  });

  test("lambda_expression - variable", () => {
    const code = "std::function<int(int)> func2 = [&](int value) -> int {};";
    const funcIterator = iterFunctions(code, "C++");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "C++")).toBe("func2");
  });

  test("lambda_expression - Anonymous", () => {
    const code = "[](int value) {};";
    const funcIterator = iterFunctions(code, "C++");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "C++")).toBe("<anonymous>");
  });

  test("template function", () => {
    const code = "template <typename T> T add(T a, T b) {}";
    const funcIterator = iterFunctions(code, "C++");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "C++")).toBe("add");
  });

  test("operator overloading", () => {
    const code = "MyType operator+(const MyType& other) const {}";
    const funcIterator = iterFunctions(code, "C++");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "C++")).toBe("operator+");
  });

  test("constructor and destructor functions", () => {
    const constructorCode = "MyClass() {}";
    const destructorCode = "~MyClass() {}";
    const funcIteratorConstructor = iterFunctions(constructorCode, "C++");
    const funcIteratorDestructor = iterFunctions(destructorCode, "C++");
    const constructorFunc = funcIteratorConstructor.next().value;
    const destructorFunc = funcIteratorDestructor.next().value;
    expect(extractFunctionName(constructorFunc, "C++")).toBe("MyClass");
    expect(extractFunctionName(destructorFunc, "C++")).toBe("~MyClass");
  });

  test("virtual function", () => {
    const code = "virtual void speak() {}";
    const funcIterator = iterFunctions(code, "C++");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "C++")).toBe("speak");
  });

  test("class nested in function", () => {
    const code = `
    int square(int num) {
    class X {
        ~X() {};
    };
    return num * num;
}`;
    const funcIterator = iterFunctions(code, "C++");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "C++")).toBe("square");
  });

  test("anynomous lambda inside named lambda", () => {
    const code = `void f() {
    auto my_func = [](){
        [](){}();
    };
}`;
    const funcIterator = iterFunctions(code, "C++");
    const foundNames = [...funcIterator].map((func) =>
      extractFunctionName(func, "C++"),
    );
    const expectedNames = ["f", "my_func", "<anonymous>"];
    expect(foundNames).toContainEqual(expectedNames);
  });
});

// Python Tests
describe("Python", () => {
  test("function_definition", () => {
    const code = "def now(tz: Optional[TZ_EXPR] = None) -> Arrow:";
    const funcIterator = iterFunctions(code, "Python");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Python")).toBe("now");
  });

  test("function_definition with async", () => {
    const code = "async def fetch_recent_messages(client):";
    const funcIterator = iterFunctions(code, "Python");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Python")).toBe("fetch_recent_messages");
  });
});
