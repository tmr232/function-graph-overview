export function* iterRanges<T>(
  ranges: SimpleRange<T>[],
): Generator<{ start: number; stop?: number; value: T }> {
  let i = 0;
  for (; i < ranges.length - 1; ++i) {
    yield {
      start: ranges[i].start,
      stop: ranges[i + 1]?.start,
      value: ranges[i].value,
    };
  }
  if (i < ranges.length) {
    yield { start: ranges[i].start, value: ranges[i].value };
  }
}