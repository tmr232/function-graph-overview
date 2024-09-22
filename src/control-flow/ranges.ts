export type Range<T> = { start: number; value: T };

function preAddRange<T>(
  start: number,
  stop: number,
  value: T,
  ranges: Range<T>[],
): { at: number; toSplice: Range<T>[]; deleteCount: number } {
  const spliceAt = ranges.findLastIndex((range) => start >= range.start);
  if (spliceAt === -1) {
    // This should never happen, as a range should always have a start element.
    throw new Error("Could not find splice position");
  }

  if (stop > ranges[spliceAt + 1]?.start) {
    // We overlap the next range, this is invalid
    throw new Error(
      `Cannot insert range at (${start}, ${stop}), overflows into range starting at ${ranges[spliceAt + 1].start}`,
    );
  }

  const toSplice = [
    { start, value },
    { start: stop, value: ranges[spliceAt].value },
  ];
  if (ranges[spliceAt].start === start) {
    // Here we replace the start of the range we found
    return { at: spliceAt, deleteCount: 1, toSplice };
  }
  return { at: spliceAt + 1, deleteCount: 0, toSplice };
}

export function newRanges<T>(value: T): Range<T>[] {
  return [{ start: 0, value }];
}

export function addRange<T>(
  start: number,
  stop: number,
  value: T,
  ranges: Range<T>[],
): Range<T>[] {
  const { at, toSplice, deleteCount } = preAddRange(start, stop, value, ranges);
  return ranges.toSpliced(at, deleteCount, ...toSplice);
}

export function inplaceAddRange<T>(
  start: number,
  stop: number,
  value: T,
  ranges: Range<T>[],
): void {
  const { at, toSplice, deleteCount } = preAddRange(start, stop, value, ranges);
  ranges.splice(at, deleteCount, ...toSplice);
}

export function getValue<T>(pos: number, ranges: Range<T>[]): T | undefined {
  return ranges.findLast((range) => pos >= range.start)?.value;
}
