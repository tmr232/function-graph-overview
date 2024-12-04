/**
 * Zips multiple arrays together, creating tuples of elements at corresponding indices.
 * Stops iterating when the shortest input array is exhausted.
 *
 * @template T An array of input arrays with potentially different element types
 * @param arrays Multiple input arrays to be zipped together
 * @returns A generator yielding tuples containing one element from each input array
 *
 * @example
 * const nums = [1, 2, 3];
 * const strs = ['a', 'b', 'c'];
 * [...zip(nums, strs)] // [[1, 'a'], [2, 'b'], [3, 'c']]
 */
export function* zip<T extends unknown[]>(
  ...arrays: [...{ [K in keyof T]: T[K][] }]
): Generator<T, void, unknown> {
  // Calculate the length of the shortest input array
  const lengths = arrays.map((array) => array.length);
  const zipLength = Math.min(...lengths);

  // Yield tuples of elements at each index
  for (let i = 0; i < zipLength; ++i) {
    yield arrays.map((array) => array[i]) as T;
  }
}

/**
 * Zips an object of arrays, creating objects with corresponding elements.
 * Stops iterating when the shortest input array is exhausted.
 *
 * @template T An object containing arrays of potentially different types
 * @param arrays Object with array values to be zipped
 * @returns A generator yielding objects with one element from each input array
 *
 * @example
 * const data = {
 *   names: ['Alice', 'Bob'],
 *   ages: [30, 25],
 *   cities: ['New York', 'London']
 * };
 * [...structZip(data)]
 * // [{ names: 'Alice', ages: 30, cities: 'New York' },
 * //  { names: 'Bob', ages: 25, cities: 'London' }]
 */
export function* structZip<T extends Record<string, unknown[]>>(
  arrays: T,
): Generator<
  { [K in keyof T]: T[K] extends Array<infer U> ? U : never },
  void,
  unknown
> {
  // Calculate the length of the shortest input array
  const lengths = Object.values(arrays).map((array) => array.length);
  const zipLength = Math.min(...lengths);

  // Yield objects with elements at each index
  for (let i = 0; i < zipLength; ++i) {
    yield Object.fromEntries(
      Object.entries(arrays).map(([name, array]) => [name, array[i]]),
    ) as { [K in keyof T]: T[K] extends Array<infer U> ? U : never };
  }
}

/**
 * Converts an optional value to an array, handling undefined cases.
 *
 * @template T The type of the input value
 * @param value Optional input value
 * @returns An array containing the value, or an empty array if undefined
 *
 * @example
 * maybe(5)       // [5]
 * maybe(undefined) // []
 */
export function maybe<T>(value: T | undefined): T[] {
  if (value === undefined) return [];
  return [value];
}

/**
 * Generates adjacent pairs from an input array.
 *
 * @template T The type of elements in the input array
 * @param items Input array to generate pairs from
 * @returns A generator yielding consecutive pairs of elements
 *
 * @example
 * [...pairwise([1, 2, 3, 4])] // [[1,2], [2,3], [3,4]]
 */
export function* pairwise<T>(items: T[]): IterableIterator<[T, T]> {
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

/**
 * Chains multiple arrays into a single iterable sequence.
 *
 * @template T The type of elements in the input arrays
 * @param arrays Multiple input arrays to be chained together
 * @returns A generator yielding all elements from input arrays in order
 *
 * @example
 * [...chain([1, 2], [3, 4], [5, 6])] // [1, 2, 3, 4, 5, 6]
 */
export function* chain<T>(...arrays: ReadonlyArray<T[]>): IterableIterator<T> {
  for (const array of arrays) {
    yield* array;
  }
}
