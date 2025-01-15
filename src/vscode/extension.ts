import * as vscode from "vscode";
import type { Language } from "../control-flow/cfg";
import {
  type ColorScheme,
  deserializeColorList,
  getDarkColorList,
  getLightColorList,
  listToScheme,
} from "../control-flow/colors";
import { OverviewViewProvider } from "./overview-view";

// ADD-LANGUAGES-HERE
const languageMapping: { [key: string]: Language } = {
  c: "C",
  cpp: "C++",
  go: "Go",
  python: "Python",
  typescript: "TypeScript",
  javascript: "TypeScript",
  typescriptreact: "TypeScript",
  javascriptreact: "TypeScript",
};

const idToLanguage = (languageId: string): Language | undefined => {
  return languageMapping[languageId];
};

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

  const language = idToLanguage(languageId);
  if (!language) {
    console.log(`Unsupported language id: ${languageId}`);
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

function focusEditor() {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    vscode.window.showTextDocument(editor.document, {
      preserveFocus: false, // This ensures the editor gets focus
      preview: false, // Don't open in preview mode
      viewColumn: editor.viewColumn,
    });
    console.log("Focus!!!");
  }
}

function moveCursorAndReveal(offset: number) {
  console.log("yo yo yo");
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  console.log("Moving!");
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
  // We use the color theme for the initial graph, as it's a good way to avoid
  // shocking the user without being overly complicated with reading custom
  // color schemes.
  const _helloWorldBGColor = isThemeDark() ? "#1e1e1e" : "white";

  // TODO: We should probably pass the initial config in here, so that the initial
  //       graph will be in the right color theme.
  const provider = new OverviewViewProvider(context.extensionUri, onNodeClick);

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

  function onNodeClick(offset: number): void {
    moveCursorAndReveal(offset);
    focusEditor();
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(
      (e: vscode.ConfigurationChangeEvent) => {
        // TODO: This currently only changes the color-scheme.
        // TODO: Make this react to all the CFG settings.
        if (e.affectsConfiguration("functionGraphOverview")) {
          const _settings = loadSettings();
          // TODO: Trigger a redraw
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(() => {
      const _settings = loadSettings();
      // TODO: Trigger a redraw
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

        provider.setCode(code, offset, language);
      },
    ),
  );

  const command = "functionGraphOverview.focus";

  const commandHandler = () => {
    vscode.commands.executeCommand("functionGraphOverview.overview.focus");
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(command, commandHandler),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

//------------------------------------------------
