import { LRUCache } from "lru-cache";

export type MemoizeFunctionConfig<
  V extends {},
  K extends {},
  Args extends unknown[],
> = {
  /** The function to memoize */
  func: (...args: Args) => V;
  /** The hash function to use for cache keys
   *
   * No comparison is made beyond the cache key.
   * */
  hash: (...args: Args) => K;
  /** Maximum number of cache entries */
  max: number;
};

/**
 * Return a memoized version of the given function
 * @param config Memoization config
 *
 */
export function memoizeFunction<
  V extends {},
  K extends {},
  Args extends unknown[],
>(config: MemoizeFunctionConfig<V, K, Args>): (...args: Args) => V {
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
