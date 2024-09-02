// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MultiDirectedGraph } from 'graphology';
import Parser, { SyntaxNode } from 'web-tree-sitter';
import treesitterGoUrl from "./tree-sitter-go.wasm";
import webTreeSitter from "web-tree-sitter/tree-sitter.wasm";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { CFGBuilder } from 'control-flow/cfg';
import { graphToDot } from 'control-flow/render';
import { simplifyCFG, trimFor } from 'control-flow/graph-ops';

let graphviz: Graphviz;
async function dot2svg() {
	console.log("svg:  ", graphviz.dot('digraph G { Hello -> World }'));
}

async function initializeParser(context: vscode.ExtensionContext, languagePath: string) {
	await Parser.init({
		locateFile(scriptName: string, scriptDirectory: string) {
			console.log("name", scriptName, "dir", scriptDirectory);
			return vscode.Uri.joinPath(context.extensionUri, "dist", webTreeSitter).fsPath;
		},
	});
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
	console.log("Found it!", webTreeSitter);
	graphviz = await Graphviz.load();

	const provider = new OverviewViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(OverviewViewProvider.viewType, provider));

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	await dot2svg();
	console.log('Congratulations, your extension "function-graph-overview" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('function-graph-overview.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Function Graph Overview!');
		provider.updateSVG();
	});

	context.subscriptions.push(disposable);
	const wasmPath = vscode.Uri.joinPath(context.extensionUri, "dist", treesitterGoUrl);
	const parser = await initializeParser(context, wasmPath.fsPath);
	const code = getCurrentGoCode() ?? "";
	const tree = await (async () => {
		try {

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

		const code = getCurrentGoCode() ?? "";
		const tree = parser.parse(code);

		console.log(`Cursor position changed: Line ${position.line + 1}, Column ${position.character + 1}`);
		let node: SyntaxNode | null = tree.rootNode.descendantForPosition({ row: position.line, column: position.character });
		const funcTypes = [
			"function_declaration",
			"method_declaration",
			"func_literal",
		];

		while (node) {
			if (funcTypes.includes(node.type)) {
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

			const builder = new CFGBuilder();
			let { graph: cfg, entry } = builder.buildCFG(node);
			cfg = trimFor(cfg);
			if (vscode.workspace.getConfiguration("functionGraphOverview").get("simplify")) {
				cfg = simplifyCFG(cfg);
			}
			const dot = graphToDot(cfg);
			const svg = graphviz.dot(dot);
			provider.setSVG(svg);
		}
	});

	context.subscriptions.push(cursorMove);

}

// This method is called when your extension is deactivated
export function deactivate() { }


//------------------------------------------------

class OverviewViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "functionGraphOverview.overview";

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public updateSVG() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'svgImage', svg: graphviz.dot('digraph G { Hello -> Again }') });
		}
	}

	public setSVG(svg: string) {
		if (this._view) {
			this._view.webview.postMessage({ type: "svgImage", svg });
		}
	}


	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
	}
	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();



		const svg = graphviz.dot('digraph G { Hello -> World }');
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Overview</title>
				<style>

				</style>
			</head>
			<body>
			<div id="overview">
				${svg}
				</div>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}