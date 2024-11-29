// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import Parser, { type SyntaxNode } from "web-tree-sitter";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { graphToDot } from "../control-flow/render";
import { simplifyCFG, trimFor } from "../control-flow/graph-ops";
import {
  newCFGBuilder,
  type Language,
  functionNodeTypes,
} from "../control-flow/cfg";
import {
  mergeNodeAttrs,
  remapNodeTargets,
  type CFG,
} from "../control-flow/cfg-defs";
import { OverviewViewProvider } from "./overview-view";
import { getValue } from "../control-flow/ranges";
import {
  deserializeColorList,
  getLightColorList,
  listToScheme,
  getDarkColorList,
  type ColorScheme,
} from "../control-flow/colors";

let graphviz: Graphviz;
interface SupportedLanguage {
  languageId: string;
  language: Language;
  parserName: string;
}
const supportedLanguages: SupportedLanguage[] = [
  {
    languageId: "c",
    language: "C" as Language,
    parserName: "tree-sitter-c.wasm",
  },
  {
    languageId: "cpp",
    language: "C++" as Language,
    parserName: "tree-sitter-cpp.wasm",
  },
  {
    languageId: "go",
    language: "Go" as Language,
    parserName: "tree-sitter-go.wasm",
  },
  {
    languageId: "python",
    language: "Python" as Language,
    parserName: "tree-sitter-python.wasm",
  },
];

const supportedLanguageIds = supportedLanguages.map((lang) => lang.languageId);
const idToLanguage = (languageId: string): Language | null => {
  for (const lang of supportedLanguages) {
    if (lang.languageId === languageId) {
      return lang.language;
    }
  }
  return null;
};

async function initializeParsers(
  context: vscode.ExtensionContext,
): Promise<Record<Language, Parser>> {
  // const parsers: { [key in Language]: Parser } = {};
  const parsers: Partial<Record<Language, Parser>> = {};

  for (const lang of supportedLanguages) {
    const languagePath = vscode.Uri.joinPath(
      context.extensionUri,
      "parsers",
      lang.parserName,
    ).fsPath;
    parsers[lang.language] = await initializeParser(context, languagePath);
  }

  return parsers as Record<Language, Parser>;
}

async function initializeParser(
  context: vscode.ExtensionContext,
  languagePath: string,
) {
  await Parser.init({
    locateFile(_scriptName: string, _scriptDirectory: string) {
      return vscode.Uri.joinPath(
        context.extensionUri,
        "parsers",
        "tree-sitter.wasm",
      ).fsPath;
    },
  });
  const parser = new Parser();
  const Go = await Parser.Language.load(languagePath);
  parser.setLanguage(Go);
  return parser;
}

function getCurrentCode(): {
  code: string;
  languageId: string;
  language: Language;
} | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null;
  }

  const document = editor.document;
  const languageId = document.languageId;
  if (!supportedLanguageIds.includes(languageId)) {
    return null;
  }

  const language = idToLanguage(languageId);
  if (!language) {
    return null;
  }

  const code = document.getText();
  return { code, languageId, language };
}

function isThemeDark(): boolean {
  const theme = vscode.window.activeColorTheme;
  return theme.kind === vscode.ColorThemeKind.Dark;
}

type Settings = {
  flatSwitch: boolean;
  simplify: boolean;
  highlightCurrentNode: boolean;
  colorScheme: ColorScheme;
};
type ColorSchemeOptions = "Light" | "Dark" | "Custom" | "System";
function loadSettings(): Settings {
  const config = vscode.workspace.getConfiguration("functionGraphOverview");

  const colorScheme: ColorSchemeOptions = config.get("colorScheme") ?? "Light";
  const colorList = (() => {
    switch (colorScheme) {
      case "System":
        if (isThemeDark()) {
          return getDarkColorList();
        }
        return getLightColorList();
      case "Light":
        return getLightColorList();
      case "Dark":
        return getDarkColorList();
      case "Custom":
        try {
          return deserializeColorList(config.get("customColorScheme") ?? "");
        } catch (error) {
          console.log(error);
          // TODO: Add a user-visible error here.
        }
        return getLightColorList();
    }
  })();

  return {
    flatSwitch: config.get("flatSwitch") ?? false,
    simplify: config.get("simplify") ?? false,
    highlightCurrentNode: config.get("highlightCurrentNode") ?? true,
    colorScheme: listToScheme(colorList),
  };
}
type CFGKey = { functionText: string; flatSwitch: boolean; simplify: boolean };

function isSameKey(a: CFGKey, b: CFGKey): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getFunctionAtPosition(
  tree: Parser.Tree,
  position: vscode.Position,
  language: Language,
): Parser.SyntaxNode | null {
  let syntax: SyntaxNode | null = tree.rootNode.descendantForPosition({
    row: position.line,
    column: position.character,
  });

  while (syntax) {
    if (functionNodeTypes[language].includes(syntax.type)) {
      break;
    }
    syntax = syntax.parent;
  }
  return syntax;
}

function focusEditor() {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    vscode.window.showTextDocument(editor.document, {
      preserveFocus: false, // This ensures the editor gets focus
      preview: false, // Don't open in preview mode
      viewColumn: editor.viewColumn,
    });
  }
}

function moveCursorAndReveal(offset: number) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const position = editor.document.positionAt(offset);
  editor.selection = new vscode.Selection(position, position);

  // Reveal the cursor position in different ways
  editor.revealRange(
    new vscode.Range(position, position),
    vscode.TextEditorRevealType.InCenterIfOutsideViewport, // Can be Default, InCenter, InCenterIfOutsideViewport, AtTop
  );
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  graphviz = await Graphviz.load();

  const helloWorldDark = `digraph G { 
    bgcolor="#1e1e1e"
    node [color="#e0e0e0", fontcolor="#e0e0e0"]
    edge [color="#e0e0e0"]
    Hello -> World 
}`;
  const helloWorldLight = "digraph G { Hello -> World }";

  // We use the color theme for the initial graph, as it's a good way to avoid
  // shocking the user without being overly complicated with reading custom
  // color schemes.
  const helloWorldSvg = graphviz.dot(
    isThemeDark() ? helloWorldDark : helloWorldLight,
  );
  const helloWorldBGColor = isThemeDark() ? "#1e1e1e" : "white";

  const provider = new OverviewViewProvider(
    context.extensionUri,
    helloWorldSvg,
    helloWorldBGColor,
    onNodeClick,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      OverviewViewProvider.viewType,
      provider,
    ),
  );

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "function-graph-overview" is now active!',
  );

  const parsers = await initializeParsers(context);

  let cfgKey: CFGKey | undefined;
  let savedCFG: CFG | undefined;

  function onNodeClick(node: string): void {
    if (!savedCFG) return;
    const offset = savedCFG.graph.getNodeAttribute(node, "startOffset");
    if (offset !== null) {
      moveCursorAndReveal(offset);
      focusEditor();
    }
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(
      (e: vscode.ConfigurationChangeEvent) => {
        // TODO: This currently only changes the color-scheme.
        // TODO: Make this react to all the CFG settings.
        if (e.affectsConfiguration("functionGraphOverview")) {
          const settings = loadSettings();
          if (!savedCFG) return;
          const dot = graphToDot(
            savedCFG,
            false,
            undefined,
            settings.colorScheme,
          );
          const svg = graphviz.dot(dot);

          provider.setSVG(svg, settings.colorScheme["graph.background"]);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(() => {
      const settings = loadSettings();
      if (!savedCFG) return;
      const dot = graphToDot(savedCFG, false, undefined, settings.colorScheme);
      const svg = graphviz.dot(dot);

      provider.setSVG(svg, settings.colorScheme["graph.background"]);
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(
      (event: vscode.TextEditorSelectionChangeEvent): void => {
        const editor = event.textEditor;
        const position = editor.selection.active;
        const offset = editor.document.offsetAt(position);

        console.log(
          `Cursor position changed: Line ${position.line + 1}, Column ${position.character + 1}`,
        );

        const { code, languageId, language } = getCurrentCode() ?? {};
        if (!code || !languageId || !language) {
          return;
        }

        const tree = parsers[language].parse(code);

        const functionSyntax = getFunctionAtPosition(tree, position, language);
        if (!functionSyntax) return;

        console.log(functionSyntax);
        const nameSyntax = functionSyntax.childForFieldName("name");
        if (nameSyntax) {
          console.log("Currently in", nameSyntax.text);
        }

        const { flatSwitch, simplify, highlightCurrentNode, colorScheme } =
          loadSettings();
        // We'd like to avoid re-running CFG generation for a function if nothing changed.
        const newKey: CFGKey = {
          flatSwitch,
          simplify,
          functionText: functionSyntax.text,
        };
        let cfg: CFG;
        if (cfgKey && isSameKey(newKey, cfgKey) && savedCFG) {
          cfg = savedCFG;
        } else {
          cfgKey = newKey;

          const builder = newCFGBuilder(language, { flatSwitch });
          cfg = builder.buildCFG(functionSyntax);
          cfg = trimFor(cfg);
          if (simplify) {
            cfg = simplifyCFG(cfg, mergeNodeAttrs);
          }
          cfg = remapNodeTargets(cfg);

          savedCFG = cfg;
        }
        // TODO: Highlighting in the DOT is a cute trick, but might become less effective on larger functions.
        //       So it works for now, but I'll probably need to replace it with CSS so that I only render once per function.

        // Only highlight if there's more than one node to the graph.
        const shouldHighlight = highlightCurrentNode && cfg.graph.order > 1;
        const nodeToHighlight = shouldHighlight
          ? getValue(cfg.offsetToNode, offset)
          : undefined;
        const dot = graphToDot(cfg, false, nodeToHighlight, colorScheme);
        const svg = graphviz.dot(dot);

        provider.setSVG(svg, colorScheme["graph.background"]);
      },
    ),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

//------------------------------------------------
