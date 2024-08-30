// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MultiDirectedGraph } from 'graphology';
import Parser, { SyntaxNode } from 'web-tree-sitter';
import treesitterGoUrl from "./tree-sitter-go.wasm";

async function initializeParser(languagePath: string) {
	await Parser.init();
	const parser = new Parser();
	const Go = await Parser.Language.load(languagePath);
	parser.setLanguage(Go);
	return parser;
}

function getCurrentGoCode(): string | null {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage('No active editor!');
		return null;
	}

	const document = editor.document;
	if (document.languageId !== 'go') {
		vscode.window.showInformationMessage('Not a Go file!');
		return null;
	}

	return document.getText();
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// console.log("Go wasm path", treesitterGoUrl);
	// console.log(vscode.Uri.joinPath(context.extensionUri, "dist", treesitterGoUrl).fsPath);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "function-graph-overview" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('function-graph-overview.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Function Graph Overview!');
	});

	context.subscriptions.push(disposable);

	const code = getCurrentGoCode() ?? "";
	const tree = await (async () => {
		try {
			const wasmPath = vscode.Uri.joinPath(context.extensionUri, "dist", treesitterGoUrl);
			const parser = await initializeParser(wasmPath.fsPath);
			const tree = parser.parse(code);
			return tree;
		} catch (error) {
			console.log(error);
			throw error;
		}
	})();




	const cursorMove = vscode.window.onDidChangeTextEditorSelection((event: vscode.TextEditorSelectionChangeEvent) => {
		const editor = event.textEditor;
		const position = editor.selection.active;

		console.log(`Cursor position changed: Line ${position.line + 1}, Column ${position.character + 1}`);
		let node: SyntaxNode | null = tree.rootNode.descendantForPosition({ row: position.line, column: position.character });
		while (node) {
			if (node.type === "function_declaration") {
				break;
			}
			node = node.parent;
		}
		// console.log(node);
		if (node) {
			console.log(node);
			const nameNode = node.childForFieldName("name");
			if (nameNode) {
				const name = editor.document.getText(new vscode.Range(new vscode.Position(nameNode.startPosition.row, nameNode.startPosition.column), new vscode.Position(nameNode.endPosition.row, nameNode.endPosition.column)));
				console.log("Currently in", name);
			}
		}
	});

	context.subscriptions.push(cursorMove);

}

// This method is called when your extension is deactivated
export function deactivate() { }
