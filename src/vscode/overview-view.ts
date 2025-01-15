import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as vscode from "vscode";
import type { Language } from "../control-flow/cfg.ts";

export class OverviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "functionGraphOverview.overview";
  private readonly helloWorldSvg: string;
  private readonly helloWorldBGColor: string;
  private readonly _nodeClickHandler: (offset: number) => void;
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    helloWorldSvg: string,
    helloWorldBGColor: string,
    nodeClickHandler: (offset: number) => void,
  ) {
    this.helloWorldSvg = helloWorldSvg;
    this.helloWorldBGColor = helloWorldBGColor;
    this._nodeClickHandler = nodeClickHandler;
  }

  public setSVG(svg: string, bgColor: string) {
    if (this._view) {
      this._view.webview.postMessage({ type: "svgImage", svg, bgColor });
    }
  }

  public setCode(code:string, offset:number, language:Language) {
    if (this._view) {
      this._view.webview.postMessage({ type: "updateCode", code, offset, language });
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
    return vscode.Uri.joinPath(this._extensionUri, "dist","jetbrains", filename);
  }

  private getWebviewUri(webview: vscode.Webview, filename: string): vscode.Uri {
    return webview.asWebviewUri(this.getUri(filename));
  }



  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = this.getWebviewUri(webview, "main.js");

    // Do the same for the stylesheet.
    const styleResetUri = this.getWebviewUri(webview, "reset.css");
    const styleVSCodeUri = this.getWebviewUri(webview, "vscode.css");
    const styleMainUri = this.getWebviewUri(webview, "main.css");

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    const htmlPath = this.getUri("index.html").fsPath;
    let html = fs.readFileSync(htmlPath).toString();

    const replacements: [RegExp, string][] = [
      [/#{nonce}/g, nonce],
      [/#{cspSource}/g, webview.cspSource],
      [/#{styleResetUri}/g, styleResetUri.toString()],
      [/#{styleVSCodeUri}/g, styleVSCodeUri.toString()],
      [/#{styleMainUri}/g, styleMainUri.toString()],
      [/#{scriptUri}/g, scriptUri.toString()],
      [/#{helloWorldSvg}/g, this.helloWorldSvg],
      [/#{helloWorldBGColor}/g, this.helloWorldBGColor],
    ];

    for (const [pattern, substitute] of replacements) {
      html = html.replaceAll(pattern, substitute);
    }

    // Make sure we did not forget any replacements
    const unreplaced = html.match(/#{\w+}/g);
    if (unreplaced) {
      console.log("Unreplaced placeholder found!", unreplaced);
    }

    return html;
  }

  private _getWebviewContent(webview: vscode.Webview) {
    // The CSS file from the React build output
    const stylesUri = this.getWebviewUri(webview,  "assets/index.css");
    // The JS file from the React build output
    const scriptUri = this.getWebviewUri(webview,  "assets/index.js");

    const nonce = getNonce();
    console.log("CSP Source", webview.cspSource);
    console.log("script uri", scriptUri);
    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline' 'nonce-${nonce}'; script-src ${webview.cspSource} 'wasm-unsafe-eval' 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" nonce="${nonce}" href="${stylesUri}">
          <title>Hello World</title>
        </head>
        <body>
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
