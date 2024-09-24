import type { Point } from "web-tree-sitter";

export type PointRange<T> = { start: Point; value: T };

function compare<T extends object>(a: T, b: T, ...keys: (keyof T)[]): number {
  for (const key of keys) {
    const aValue = a[key];
    const bValue = b[key];
    if (aValue < bValue) return -1;
    if (aValue > bValue) return 1;
  }
  return 0;
}

export function comparePoints(a: Point, b: Point): number {
  return compare(a, b, "row", "column")
}

function preAddRange<T>(
  ranges: PointRange<T>[],
  start: Point,
  stop: Point,
  value: T,
): { at: number; toSplice: PointRange<T>[]; deleteCount: number } {
  const spliceAt = ranges.findLastIndex((range) => comparePoints(start, range.start) >= 0);
  if (spliceAt === -1) {
    // This should never happen, as a range should always have a start element.
    throw new Error("Could not find splice position");
  }

  if (ranges[spliceAt + 1] && comparePoints(stop, ranges[spliceAt + 1].start) > 0) {
    // We overlap the next range, this is invalid
    throw new Error(
      `Cannot insert range at (${start}, ${stop}), overflows into range starting at ${ranges[spliceAt + 1].start}`,
    );
  }

  const toSplice = [
    { start, value },
    { start: stop, value: ranges[spliceAt].value },
  ];
  if (comparePoints(ranges[spliceAt].start, start) === 0) {
    // Here we replace the start of the range we found
    return { at: spliceAt, deleteCount: 1, toSplice };
  }
  return { at: spliceAt + 1, deleteCount: 0, toSplice };
}

export function newRanges<T>(value: T): PointRange<T>[] {
  return [{ start: { column: 0, row: 0 }, value }];
}

export function addRange<T>(
  ranges: PointRange<T>[],
  start: Point,
  stop: Point,
  value: T,
): PointRange<T>[] {
  const { at, toSplice, deleteCount } = preAddRange(ranges, start, stop, value,);
  return ranges.toSpliced(at, deleteCount, ...toSplice);
}

export function inplaceAddRange<T>(
  ranges: PointRange<T>[],
  start: Point,
  stop: Point,
  value: T,
): void {
  const { at, toSplice, deleteCount } = preAddRange(ranges, start, stop, value,);
  ranges.splice(at, deleteCount, ...toSplice);
}

export function getValue<T>(ranges: PointRange<T>[], pos: Point): T | undefined {
  return ranges.findLast((range) => comparePoints(pos, range.start) >= 0)?.value;
}


export function* iterRanges<T>(ranges: PointRange<T>[]): Generator<{ start: Point, stop?: Point, value: T }> {
  let i = 0
  for (; i < ranges.length - 1; ++i) {
    yield { start: ranges[i].start, stop: ranges[i + 1].start, value: ranges[i].value }
  }
  if (i < ranges.length) {
    yield { start: ranges[i].start, value: ranges[i].value }
  }
}