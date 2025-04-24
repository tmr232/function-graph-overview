import { beforeAll, describe, expect, test } from "vitest";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { initParsers, iterFunctions } from "../file-parsing/vite.ts";

// Initialize parsers once before all tests
beforeAll(async () => {
  await initParsers();
});

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
    expect(extractFunctionName(func, "Go")).toBe("<Anonymous>");
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
    expect(extractFunctionName(func, "Go")).toBe("y, x");
  });

  test("nested function", () => {
    const code = "func outer() { func inner() {} inner() }";
    const funcIterator = iterFunctions(code, "Go");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "Go")).toBe("outer");
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
    expect(extractFunctionName(func, "C++")).toBe("<Anonymous>");
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

// TypeScript Tests
describe("TypeScript", () => {
  test("function_declaration", () => {
    const code = "export function getStatementHandlers(): StatementHandlers {}";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe(
      "getStatementHandlers",
    );
  });

  test("arrow_function with variable", () => {
    const code = "const returnInArray = <T,>(value: T): T[] => {};";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("returnInArray");
  });

  test("arrow_function with no parent", () => {
    const code = "<T,>(value: T): T[] => {};";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("<Anonymous>");
  });

  test("arrow functions assigned to multiple variables", () => {
    const code = "let x = () => {}, y = () => {};";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("<unsupported>");
  });

  test("method_definition", () => {
    const code =
      "class SmartPhone { setPrice(smartPhonePrice: number) : void {} }";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("setPrice");
  });

  test("function_expression with variable", () => {
    const code = "const myFunction = function(name1: string): string {};";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("myFunction");
  });

  test("function_expression with no variable", () => {
    const code = "function(name1: string): string {};";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("<Anonymous>");
  });

  test("generator_function with variable", () => {
    const code = "const fn = function* <T>(input: T): Generator<number> {}";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("fn");
  });

  test("generator_function with no variable", () => {
    const code = "function* <T>(input: T): Generator<number> {}";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("<Anonymous>");
  });

  test("generator_function_declaration", () => {
    const code =
      "function* iterTestFunctions(tree: Parser.Tree): Generator<TestFunction> {}";
    const funcIterator = iterFunctions(code, "TypeScript");
    const func = funcIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("iterTestFunctions");
  });
});
