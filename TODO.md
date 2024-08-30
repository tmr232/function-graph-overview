# Big Tasks

- [x] Make sure I can load my packages in VSCode
  - Seems that installing them with pnpm and then importing them works fine.
  - Not sure what happens if I try to use them in the webview itself, but we'll see later.
- [x] Make sure I can load additional wasm code
  - Loading is a bit iffy, but it works!
- [x] Display a webview-view
- [x] Have the view show the name of the current function
  - We can show the current cursor position with `vscode.window.onDidChangeTextEditorSelection`
  - We should be able to get the function with language-services. Or, worst case scenario, with TreeSitter.
  - Seems like the easiest way would be to tree-sitter the entire file, then use `Parser.SyntaxNode.descendantForPosition`
    From there we should be able to use `.parent` until we get a function, then use that for graphing.
- [x] Install the d3-graphviz package and render a basic dotfile in the view
  - [@hpcc-js/wasm-graphviz](https://github.com/hpcc-systems/hpcc-js-wasm) might be a better option,
    as I currently don't want the interactivity and it allows generating an SVN directly.
- [x] Update the webview graph
- [ ] Add the remaining parts of the graph overview
