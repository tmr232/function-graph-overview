import { test } from 'bun:test'
import { TestManager } from "./commentTestUtils";
import { testFunctions as testFuncsForGo } from './collect-go';
import { testFunctions as testFuncsForC } from './collect-c';

const testManagerForC = new TestManager({
    testFunctions: [...testFuncsForC],
});

test.each(testManagerForC.allTests)(testManagerForC.nameFormat, testManagerForC.invoke);

const testManagerForGo = new TestManager({
    testFunctions: [...testFuncsForGo],
});

test.each(testManagerForGo.allTests)(testManagerForGo.nameFormat, testManagerForGo.invoke);