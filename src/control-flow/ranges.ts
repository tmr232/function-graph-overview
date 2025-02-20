type SimpleRange<T> = { start: number; value: T };

function preAddRange<T>(
  ranges: readonly SimpleRange<T>[],
  start: number,
  stop: number,
  value: T,
): { at: number; toSplice: SimpleRange<T>[]; deleteCount: number } {
  const spliceAt = ranges.findLastIndex((range) => start >= range.start);
  if (spliceAt === -1) {
    // This should never happen, as a range should always have a start element.
    throw new Error("Could not find splice position");
  }

  // @ts-expect-error: The last range has an undefined stop, so the condition won't hold for it.
  if (stop > ranges[spliceAt + 1]?.start) {
    // We overlap the next range, this is invalid
    throw new Error(
      // @ts-expect-error: If we're here, `ranges[spliceAt +1]` must be defined.
      `Cannot insert range at (${start}, ${stop}), overflows into range starting at ${ranges[spliceAt + 1].start}`,
    );
  }

  const toSplice = [
    { start, value },
    // @ts-expect-error: ranges[spliceAt] is always defined
    { start: stop, value: ranges[spliceAt].value },
  ];
  // @ts-expect-error: ranges[spliceAt] is always defined
  if (ranges[spliceAt].start === start) {
    // Here we replace the start of the range we found
    return { at: spliceAt, deleteCount: 1, toSplice };
  }
  return { at: spliceAt + 1, deleteCount: 0, toSplice };
}

function newRanges<T>(value: T): SimpleRange<T>[] {
  return [{ start: 0, value }];
}

function inplaceAddRange<T>(
  ranges: SimpleRange<T>[],
  start: number,
  stop: number,
  value: T,
): void {
  const { at, toSplice, deleteCount } = preAddRange(ranges, start, stop, value);
  ranges.splice(at, deleteCount, ...toSplice);
}

/**
 * Get the value at the given position
 * @param ranges The ranges to query
 * @param pos The position to query. Must be >=0.
 */
function getValue<T>(ranges: SimpleRange<T>[], pos: number): T {
  const lastMatch = ranges.findLast((range) => pos >= range.start);
  if (!lastMatch) {
    // This should never happen. But if it does - it's better to get a
    // well-defined error.
    throw new Error(`Failed to find value at given position ${pos}`);
  }
  return lastMatch.value;
}

function* iterRanges<T>(
  ranges: SimpleRange<T>[],
): Generator<{ start: number; stop?: number; value: T }> {
  let i = 0;
  for (; i < ranges.length - 1; ++i) {
    yield {
      // @ts-expect-error: We know ranges[i] exists.
      start: ranges[i].start,
      // Last range should have an undefined `stop`
      stop: ranges[i + 1]?.start,
      // @ts-expect-error: We know ranges[i] exists.
      value: ranges[i].value,
    };
  }
  if (i < ranges.length) {
    // @ts-expect-error: We know ranges[i] exists.
    yield { start: ranges[i].start, value: ranges[i].value };
  }
}

export class Lookup<T> {
  private ranges: SimpleRange<T>[];
  constructor(value: T) {
    this.ranges = newRanges(value);
  }

  public add(start: number, stop: number, value: T): void {
    inplaceAddRange(this.ranges, start, stop, value);
  }

  public get(position: number): T {
    return getValue(this.ranges, position);
  }

  public mapValues<U>(fn: (value: T) => U): Lookup<U> {
    const lookup = new Lookup(fn(this.get(0)));
    lookup.ranges = Array.from(iterRanges(this.ranges)).map(
      ({ start, value }) => ({
        start,
        value: fn(value),
      }),
    );
    return lookup;
  }

  [Symbol.iterator]() {
    return iterRanges(this.ranges);
  }

  public values(): T[] {
    return Array.from(iterRanges(this.ranges)).map(({ value }) => value);
  }

  public clone(): Lookup<T> {
    const lookup = new Lookup(this.get(0));
    lookup.ranges = [...this.ranges];
    return lookup;
  }
}
