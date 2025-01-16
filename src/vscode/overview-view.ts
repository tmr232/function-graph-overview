import * as crypto from "node:crypto";
import * as vscode from "vscode";
import type { Language } from "../control-flow/cfg.ts";

export class OverviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "functionGraphOverview.overview";
  private readonly _nodeClickHandler: (offset: number) => void;
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    nodeClickHandler: (offset: number) => void,
    private readonly isDark: boolean,
  ) {
    this._nodeClickHandler = nodeClickHandler;
  }

  public setCode(code: string, offset: number, language: Language) {
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateCode",
        code,
        offset,
        language,
      });
    }
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): Thenable<void> | void {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    console.log("webview options", webviewView.webview.options);

    webviewView.webview.html = this._getWebviewContent(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.event) {
        case "node-clicked":
          console.log("Node clicked!", message.offset, this._nodeClickHandler);
          this._nodeClickHandler(message.offset);
      }
    });
  }

  private getUri(filename: string): vscode.Uri {
    return vscode.Uri.joinPath(
      this._extensionUri,
      "dist",
      "jetbrains",
      filename,
    );
  }

  private getWebviewUri(webview: vscode.Webview, filename: string): vscode.Uri {
    return webview.asWebviewUri(this.getUri(filename));
  }

  private _getWebviewContent(webview: vscode.Webview) {
    const stylesUri = this.getWebviewUri(webview, "assets/index.css");
    const scriptUri = this.getWebviewUri(webview, "assets/index.js");

    const nonce = getNonce();
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline' 'nonce-${nonce}'; script-src ${webview.cspSource} 'wasm-unsafe-eval' 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" nonce="${nonce}" href="${stylesUri}">
          <title>Function Graph Overview</title>
        </head>
        <body data-theme="${this.isDark ? "dark" : "light"}">
          <div id="app"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }
}

function getNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}
