import objectHash from "object-hash";
import { LRUCache } from "lru-cache";

export function memoized<R extends {}>(
  fn: (...args: any[]) => R,
  hashFunc: (...args: any[]) => string,
  capacity: number,
): (...args: any[]) => R {
  const cache = new LRUCache<string, R>({ max: capacity });
  return (...args: any[]) => {
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

  const m = memoized(
    (a: number, b: string, c: number) => {
      console.log(b);
      return a + c;
    },
    (a, b, c) => objectHash([a, c]),
    4,
  );

  m(1,"a",2);
  m(1,"b",2);
  m(1,"c",3);


