import * as crypto from "node:crypto";
import * as vscode from "vscode";
import {
  MessageHandler,
  type MessageHandlersOf,
  type MessageToVscode,
  type MessageToWebview,
} from "./messages.ts";

export class OverviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "functionGraphOverview.overview";
  private _view?: vscode.WebviewView;
  private messageHandler: MessageHandler<MessageToVscode>;

  /**
   * Initialize the WebView
   * @param _extensionUri
   * @param isDark theme to use for the initial graph
   * @param messageHandlers handlers for messages from the webview
   */
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly isDark: boolean,
    messageHandlers: MessageHandlersOf<MessageToVscode>,
  ) {
    this.messageHandler = new MessageHandler(messageHandlers);
  }

  /**
   * Post a message to the WebView, to be handled there.
   * @param message The message to post
   */
  public postMessage<T extends MessageToWebview>(message: T) {
    if (this._view) {
      this._view.webview.postMessage(message);
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
    webviewView.webview.onDidReceiveMessage((message: MessageToVscode) =>
      this.messageHandler.handleMessage(message),
    );
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
