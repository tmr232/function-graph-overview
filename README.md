# Function Graph Overview

[Control-flow graph](https://en.wikipedia.org/wiki/Control-flow_graph) visualization for VS Code.

This extension adds a Graph Overview to VS Code, showing the CFG (control-flow graph) for the current function.

![Screenshot of the extension](./media/screenshots/banner.png)

## Installation

Install via the [extension page](https://marketplace.visualstudio.com/items?itemName=tamir-bahar.function-graph-overview) at the VSCode Marketplace.

## Demo

You can try it out via an [interactive demo](https://tmr232.github.io/function-graph-overview/) if you don't want to install it.

Note that the demo only supports a single function and ignores the cursor location.

## Supported Languages

- Go

## Development

### Requirements

- [Bun](https://bun.sh/) is required to develop the project.
- [Bun for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=oven.bun-vscode) is needed for debugging in VS Code
- [emscripted](https://emscripten.org/) is only required if you want to add new tree-sitter parsers.

### Getting Started

Clone the project and install dependencies.

```bash
git clone https://github.com/tmr232/function-graph-overview/
cd function-graph-overview
bun install
```

You can debug the extension via VS Code by pressing F5.

To run the demo, run `bun demo`.
