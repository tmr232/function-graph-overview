/**
 * Creates a new object by cloning the original and applying partial updates.
 * This function follows immutable update patterns, ensuring the original object remains unchanged.
 *
 * @template T The type of the object being evolved
 * @param obj The original object to be cloned
 * @param attrs Partial attributes to update on the new object
 * @returns A new object with the original properties and specified updates applied
 *
 * @example
 * // Basic usage
 * const user = { name: 'Alice', age: 30 };
 * const updatedUser = evolve(user, { age: 31 });
 * // Result: { name: 'Alice', age: 31 }
 * // Original user object remains { name: 'Alice', age: 30 }
 *
 */
export function evolve<T extends object>(obj: T, attrs: Partial<T>): T {
  const newObj = structuredClone(obj);
  Object.assign(newObj, attrs);
  return newObj;
}
