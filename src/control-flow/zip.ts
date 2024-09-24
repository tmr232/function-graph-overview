export function* zip<T extends unknown[]>(
  ...arrays: [...{ [K in keyof T]: T[K][] }]
): Generator<T, void, unknown> {
  const lengths = arrays.map((array) => array.length);
  const zipLength = Math.min(...lengths);
  for (let i = 0; i < zipLength; ++i) {
    yield arrays.map((array) => array[i]) as T;
  }
}

export function* structZip<T extends Record<string, unknown[]>>(
  arrays: T,
): Generator<
  { [K in keyof T]: T[K] extends Array<infer U> ? U : never },
  void,
  unknown
> {
  const lengths = Object.values(arrays).map((array) => array.length);
  const zipLength = Math.min(...lengths);
  for (let i = 0; i < zipLength; ++i) {
    yield Object.fromEntries(
      Object.entries(arrays).map(([name, array]) => [name, array[i]]),
    ) as { [K in keyof T]: T[K] extends Array<infer U> ? U : never };
  }
}

export function maybe<T>(value: T | undefined): T[] {
  if (value === undefined) return [];
  return [value];
}

export function* pairwise<T>(items: T[]): Generator<[T, T], void, unknown> {
  const iterator = items[Symbol.iterator]();
  let { value: a } = iterator.next();
  for (const b of iterator) {
    // We know that if we got here, `a` cannot be undefined as there
    // was at least one more value in the iterator.
    // But tsc can't deduce it, so we help it.
    yield [a as T, b];
    a = b;
  }
}
