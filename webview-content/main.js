//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(() => {
  const vscode = acquireVsCodeApi();

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
      case "svgImage": {
        displaySVG(message.svg, message.bgColor);
        break;
      }
    }
  });

  window.addEventListener("click", onClick);

  /**
   *
   * @param {string} svgMarkup
   */
  function displaySVG(svgMarkup, bgColor) {
    const div = document.querySelector("#overview");
    if (div) div.innerHTML = svgMarkup;
    document.body.style.backgroundColor = bgColor;
  }

  function onClick(event) {
    let target = event.target;
    while (
      target.tagName !== "div" &&
      target.tagName !== "svg" &&
      !target.classList.contains("node")
    ) {
      target = target.parentElement;
    }
    if (!target.classList.contains("node")) {
      return;
    }
    vscode.postMessage({ event: "node-clicked", node: target.id });
  }
})();
