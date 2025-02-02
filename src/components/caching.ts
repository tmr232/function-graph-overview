import { LRUCache } from "lru-cache";

/**
 * Return a memoized version of the given function
 * @param fn The function to memoize
 * @param hashFunc Hash function to use for the arguments
 * @param capacity Number of entries to keep memoized
 */
export function memoizeFunction<V extends {}, K extends {}, Args extends unknown[]>(
  fn: (...args: Args) => V,
  hashFunc: (...args: Args) => K,
  capacity: number,
): (...args: Args) => V {
  const cache = new LRUCache<K, V>({ max: capacity });
  return (...args: Args) => {
    const key = hashFunc(...args);
    const cachedValue = cache.get(key);
    if (cachedValue) {
      return cachedValue;
    }
    const calculatedValue = fn(...args);
    cache.set(key, calculatedValue);
    return calculatedValue;
  };
}