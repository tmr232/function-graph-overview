import * as vscode from "vscode";
import * as fs from "fs";
import * as crypto from "crypto";

export class OverviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "functionGraphOverview.overview";
  private readonly helloWorldSvg: string;
  private readonly helloWorldBGColor: string;
  private readonly _nodeClickHandler: (node: string) => void;
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    helloWorldSvg: string,
    helloWorldBGColor: string,
    nodeClickHandler: (node: string) => void,
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

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.event) {
        case "node-clicked":
          this._nodeClickHandler(message.node);
      }
    });
  }

  private getUri(filename: string): vscode.Uri {
    return vscode.Uri.joinPath(this._extensionUri, "webview-content", filename);
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
}

function getNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}
