export function evolve<T extends object>(
    obj: T,
    attrs: Partial<T>): T {
    const newObj = structuredClone(obj);
    Object.assign(newObj, attrs);
    return newObj;
}

