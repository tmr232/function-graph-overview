import "core-js/actual/regexp/escape";

export function matchWildcard(pattern: string, searchString: string): boolean {
  return new RegExp(
    // @ts-expect-error `escape` is added by core-js.
    `^${pattern.split("*").map(RegExp.escape).join(".*")}$`,
  ).test(searchString);
}
