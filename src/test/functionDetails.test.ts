import { beforeAll, expect, test } from "bun:test";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import { initParsers, iterFunctions } from "../file-parsing/vite.ts";

// Initialize parsers once before all tests
beforeAll(async () => {
  await initParsers();
});

// Go Tests
test("Go: function_declaration", () => {
  const code = `func main() {
    log.SetPrefix("mkzip: ")
    log.SetFlags(0)
  }`;
  const funcIterator = iterFunctions(code, "Go");
  const func = funcIterator.next().value; // Extract the first function node
  expect(extractFunctionName(func, "Go")).toBe("main");
});
test("Go: method_declaration", () => {
  const code = `func (l *Literal) Execute(writer io.Writer, data map[string]interface{}) core.ExecuteState {
    writer.Write(l.Value)
    return core.Normal
  }`;
  const funcIterator = iterFunctions(code, "Go");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "Go")).toBe("Execute");
});
test("Go: func_literal assigned to variable", () => {
  const code = `isDebugInts := func(s string) bool {
		// Some systems use leading _ to denote non-assembly symbols.
		return s == "__cgodebug_ints" || s == "___cgodebug_ints"
	}`;
  const funcIterator = iterFunctions(code, "Go");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "Go")).toBe("isDebugInts");
});

test("Go: func_literal with no parent", () => {
  const code = `return func(x int) int {
        sum += x
        return sum
    }`;
  const funcIterator = iterFunctions(code, "Go");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "Go")).toBe("Anonymous");
});

// C Tests
test("C: function_definition", () => {
  const code = `static void
tr_where (const void caller, Dl_infoinfo)
{
  if (caller != NULL)
  {
    printf ("tr_where: %s\n", caller->tr_name);  
  }
  else
  {
    printf ("tr_where: NULL\n");
  }
}`;
  const funcIterator = iterFunctions(code, "C");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "C")).toBe("tr_where");
});

// C++ Tests
test("C++: function_definition", () => {
  const code = `unsigned int Miner::calculate_hash_code() {
    timestamp = std::time(nullptr); //take the current time since 1970 (unix epoch)
        std::string data_to_hash = std::to_string(height_target) + std::to_string(nonce) + std::to_string(timestamp) +
                                   std::to_string(last_hash) + std::to_string(id);
    uLong crc_res = 0;
    crc_res = crc32(crc_res, reinterpret_cast<const Bytef *>(data_to_hash.c_str()), data_to_hash.size());
    //reinterpret cast is used to cast the pointer.
    return crc_res;
}`;
  const funcIterator = iterFunctions(code, "C++");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "C++")).toBe("calculate_hash_code");
});

test("C++: lambda_expression - variable", () => {
  const code = `auto f = [](int value) {
        std::cout << value << std::endl;
    };`;
  const funcIterator = iterFunctions(code, "C++");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "C++")).toBe("f");
});

test("C++: lambda_expression - variable", () => {
  const code = `std::function<int(int)> func2 = [&](int value) -> int {
        return 1+value+important;
    };`;
  const funcIterator = iterFunctions(code, "C++");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "C++")).toBe("func2");
});

test("C++: lambda_expression - Anonymous", () => {
  const code = `[](int value) {
    std::cout << value << std::endl;
};`;
  const funcIterator = iterFunctions(code, "C++");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "C++")).toBe("Anonymous");
});

// Python Tests
test("Python: function_definition", () => {
  const code = `def now(tz: Optional[TZ_EXPR] = None) -> Arrow:
    """Calls the default :class:ArrowFactory <arrow.factory.ArrowFactory> now method."""
    return _factory.now(tz)`;
  const funcIterator = iterFunctions(code, "Python");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "Python")).toBe("now");
});
test("Python: function_definition", () => {
  const code = `async def fetch_recent_messages(client):
    logger.info("Fetching recent messages from source channels...")
    data = load_message_history()
    for channel in SOURCE_CHANNELS:
        try:
            entity = await client.get_entity(channel)
            history = await client(GetHistoryRequest(peer=entity, limit=100, offset_date=None, offset_id=0, max_id=0, min_id=0, add_offset=0, hash=0))

            for message in history.messages:
                if message.message:
                    message_text = message.message.lower()
                    msg_id = message.id
                    chat_id = entity.id
                    msg_key = f"{chat_id}-{msg_id}"

                    if any(keyword in message_text for keyword in KEYWORDS):
                        if msg_key not in data["messages"]:
                            logger.info(f" Found relevant past message in {channel}, forwarding...")
                            await client.forward_messages(TARGET_CHANNEL_ID, message)
                            data["messages"][msg_key] = time.time()
                            save_message_history(data)
        except Exception as e:
            logger.error(f"Failed to fetch messages from {channel}: {str(e)}")
`;
  const funcIterator = iterFunctions(code, "Python");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "Python")).toBe("fetch_recent_messages");
});

// test("Python: function_definition with no identifier", () => {
//   const code = `data = load_message_history()`;
//   const funcIterator = iterFunctions(code, "Python");
//   const func = funcIterator.next().value;
//   console.log(func);
//   expect(extractFunctionName(func, "Python")).toBeUndefined();
// });

// TypeScript Tests
test("TypeScript: function_declaration", () => {
  const code = `export function getStatementHandlers(): StatementHandlers {
  return {
    named: Object.fromEntries(Object.entries(statementHandlers.named)),
    default: statementHandlers.default,
  };
}
`;
  const funcIterator = iterFunctions(code, "TypeScript");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "TypeScript")).toBe("getStatementHandlers");
});

test("TypeScript: arrow_function with variable", () => {
  const code = `const returnInArray = <T,>(value: T): T[] => {
  return [value];
};`;
  const funcIterator = iterFunctions(code, "TypeScript");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "TypeScript")).toBe("returnInArray");
});

test("TypeScript: arrow_function with no parent", () => {
  const code = `<T,>(value: T): T[] => {
    return [value];
  };`;
  const funcIterator = iterFunctions(code, "TypeScript");
  const func = funcIterator.next().value;
  expect(extractFunctionName(func, "TypeScript")).toBe("Anonymous");
});

test("TypeScript: method_definition", () => {
  const code = `class SmarPhone {
    color: string
    brand: SmartPhoneBrand
    price:number    
    
    setPrice(smartPhonePrice: number) : void
    {
        this.price = smartPhonePrice;
    }
    constructor() {
    //default values using constructor
    this.color = "white";
    this.brand = SmartPhoneBrand.Other;
    this.price = 0;
    }
}
`;
  const functIterator = iterFunctions(code, "TypeScript");
  const func = functIterator.next().value;
  expect(extractFunctionName(func, "TypeScript")).toBe("setPrice");
});

test("TypeScript: function_expression with variable", () => {
  const code = `const myFunction = function(name1: string): string {
    return "Hello name1!";
    };`;
  const functIterator = iterFunctions(code, "TypeScript");
  const func = functIterator.next().value;
  expect(extractFunctionName(func, "TypeScript")).toBe("myFunction");
});
test("TypeScript: function_expression with no variable", () => {
  const code = `function(name1: string): string {
    return "Hello name1!";
    };`;
  const functIterator = iterFunctions(code, "TypeScript");
  const func = functIterator.next().value;
  expect(extractFunctionName(func, "TypeScript")).toBe("Anonymous");
});

test("TypeScript: generator_function with variable", () => {
  const code = `const fn = function* <T>(input: T): Generator<number> {
  yield 2;
}`;
  const functIterator = iterFunctions(code, "TypeScript");
  const func = functIterator.next().value;
  expect(extractFunctionName(func, "TypeScript")).toBe("fn");
});

test("TypeScript: generator_function with no variable", () => {
  const code = `function* <T>(input: T): Generator<number> {
    yield 2;
  }`;
    const functIterator = iterFunctions(code, "TypeScript");
    const func = functIterator.next().value;
    expect(extractFunctionName(func, "TypeScript")).toBe("Anonymous");
});

test("TypeScript: generator_function_declaration", () => {
  const code = `function* iterTestFunctions(tree: Parser.Tree): Generator<TestFunction> {
  const matches = testFuncQuery.matches(tree.rootNode, { maxStartDepth: 1 });

  for (const match of matches) {
    for (
      let i = 0;
      i < match.captures.length;
      i += testFuncQuery.captureNames.length - 1
    ) {
      const captures = match.captures;
      const comments = [];
      // @ts-expect-error: We know that the captures are OK
      for (; captures[i].name === "comment"; ++i) {
        // @ts-expect-error: We know that the captures are OK
        comments.push(captures[i].node.text.slice(1).trim());
      }
      yield {
        // @ts-expect-error: We know that the captures are OK
        function: captures[i].node,
        reqs: parseComment(comments.join("\n")),
        // @ts-expect-error: We know that the captures are OK
        name: captures[i + 1].node.text,
        language: "Python",
      };
    }
  }
}`;
  const functIterator = iterFunctions(code, "TypeScript");
  const func = functIterator.next().value;
  expect(extractFunctionName(func, "TypeScript")).toBe("iterTestFunctions");
});
