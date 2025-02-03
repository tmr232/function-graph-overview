import { expect, test } from "bun:test";
import { LRUCache } from "lru-cache";
import objectHash from "object-hash";
test("Ensure the cache does not hash objects", () => {
  const cache = new LRUCache({ max: 10 });
  const keyA = { key: "A" };
  const keyB = { key: "A" };

  cache.set(keyA, 1);
  expect(cache.get(keyB)).toBeUndefined();
});

test("Now with hashing", () => {
  const cache = new LRUCache({ max: 10 });
  const keyA = { key: "A" };
  const keyB = { key: "A" };

  cache.set(objectHash(keyA), 1);
  expect(cache.get(objectHash(keyB))).toBe(1);
});
