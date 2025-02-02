import { LRUCache } from "lru-cache";

/**
 * Return a memoized version of the given function
 * @param config Memoization config
 *
 */
export function memoizeFunction<
  V extends {},
  K extends {},
  Args extends unknown[],
>(config: {
  func: (...args: Args) => V;
  hash: (...args: Args) => K;
  max: number;
}): (...args: Args) => V {
  const cache = new LRUCache<K, V>({ max: config.max });
  return (...args: Args) => {
    const key = config.hash(...args);
    const cachedValue = cache.get(key);
    if (cachedValue) {
      return cachedValue;
    }
    const calculatedValue = config.func(...args);
    cache.set(key, calculatedValue);
    return calculatedValue;
  };
}
