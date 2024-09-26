import Parser from "web-tree-sitter";

await Parser.init();

export async function initializeParser(
  languageUrl: string,
): Promise<{ parser: Parser; language: Parser.Language }> {
  const parser = new Parser();
  const language = await Parser.Language.load(languageUrl);
  parser.setLanguage(language);
  return { parser, language };
}
