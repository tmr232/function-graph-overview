import { test, expect } from "bun:test";
import {
    addRange,
    getValue,
    inplaceAddRange,
    newRanges,
} from "../control-flow/ranges";

test("Basic Range Test", () => {
    let ranges = newRanges("A");

    ranges = addRange(10, 20, "B", ranges);
    ranges = addRange(30, 40, "C", ranges);

    expect(ranges).toEqual([
        { start: 0, value: "A" },
        { start: 10, value: "B" },
        { start: 20, value: "A" },
        { start: 30, value: "C" },
        { start: 40, value: "A" },
    ]);
});

test("Add to 0", () => {
    const ranges = newRanges("A");
    inplaceAddRange(0, 20, "B", ranges);

    expect(ranges).toEqual([
        { start: 0, value: "B" },
        { start: 20, value: "A" },
    ]);
});

test("Add to same start", () => {
    let ranges = newRanges("A");

    ranges = addRange(10, 60, "B", ranges);
    ranges = addRange(10, 40, "C", ranges);

    expect(ranges).toEqual([
        { start: 0, value: "A" },
        { start: 10, value: "C" },
        { start: 40, value: "B" },
        { start: 60, value: "A" },
    ]);
});

test("Invalid range addition", () => {
    const ranges = newRanges("A");

    inplaceAddRange(50, 60, "B", ranges);
    expect(() => {
        inplaceAddRange(45, 55, "C", ranges);
    }).toThrowError(/Cannot insert range at/);
});

test("Get Value", () => {
    let ranges = newRanges("A");

    ranges = addRange(10, 20, "B", ranges);
    ranges = addRange(30, 40, "C", ranges);

    expect(getValue(15, ranges)).toBe("B");
    expect(getValue(0, ranges)).toBe("A");
});
