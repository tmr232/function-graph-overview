import { testFunctions as testFuncsForGo } from "../src/test/collect-go";
import { testFunctions as testFuncsForC } from "../src/test/collect-c";
import { intoRecords } from "../src/test/commentTestUtils";

const records = intoRecords([...testFuncsForC, ...testFuncsForGo]);

Bun.write("./dist/tests/commentTests.json", JSON.stringify(records));
