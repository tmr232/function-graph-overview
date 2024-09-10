import type { Requirements } from "./commentTestTypes";
/*
TODO: Write a script that collects all the test code and generates a webpage
      showing it.
      - Toggle to show only failing tests
      - The usual display toggles
      - Ability to show markers instead of node content
      - Shows the reason the test failed (in text!)
*/

export function parseComment(text: string): Requirements {
  const jsonContent = text
    .slice(2, -2)
    .trim()
    .replaceAll(/^(?=\w)/gm, '"')
    .replaceAll(/:/gm, '":');
  return JSON.parse(`{${jsonContent}}`);
}
