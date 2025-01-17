# Change Log

All notable changes to the "function-graph-overview" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added

- Region comment note overlay thingies in the demo, hidden in debug mode or under the `showRegions` parameter.
  Once enabled, use `cfg-overlay-start: My Message` and `cfg-overlay-end` comments to delimit regions and show
  them in the graph.

### Fixed

- `finally` blocks are now supported in TypeScript. 

### Changed

- VSCode and JetBrains now use the same WebView content.
- Placeholder ("Hello, World!") graph colors are now determined by the color scheme.
- VSCode settings now applied instantly to the graph.

## [0.0.13] - 2025-01-06

### Added

- The JetBrains plugin can now change settings: flat switch, simplification, highlighting, and color scheme
- `/render` page to render code directly from GitHub, given a URL with a line number.
- `render-graph.ts` script to render a graph from a JSON file exported from code
- `/render` page can now render a graph provided to it directly.

### Fixed

- `detectBacklinks` no longer has infinite loops on specific cases, and is faster.

## [0.0.12] - 2024-12-18

### Added

- A simple CLI script to render a single function from a file (`scripts/render-function.ts`)
- [Developer docs](https://tmr232.github.io/function-graph-overview/docs)
- Support for click-to-navigate in the [JetBrains plugin](https://github.com/tmr232/jb-function-graph-overview).
- Support for TypeScript (and JavaScript, as a subset)
- Support for TSX (and JSX, as a subset)

### Changed

- Unified a lot of the statement processing code between different languages
- Python & C++ no longer marked experimental.

### Fixed

- `continue label` and `break label` now work properly in Go
- Infinite C-style loops in Go are now recognized correctly.

## [0.0.11]

### Added

- Added the `Function Graph Overview: Show Graph Overview` command to VSCode to show the graph

### Changed

- In VSCode, the extension will now show in the activity bar by default
- All development-related docs moved to the `docs` directory to avoid confusing users

## [0.0.10]

### Added

- Added JetBrains frontend for use in JetBrains IDE plugin
- Demo: Added a link to the JetBrains plugin page
- Demo learned to change font-size
- Documented the process of adding a new language
- [Biome](https://biomejs.dev/linter/) has been added as an additional linter
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) has been added to auto-fix some common issues
- The `generate-parsers.ts` script has been updated to support copying existing `.wasm` files from tree-sitter grammar packages
- Initial support for C++
- A basic [typedoc](https://typedoc.org/) configuration was added, to help in rendering docs
- A utility script for running CFG builders on a complete codebase (`scan-codebase.ts`)

### Changed

- Adding a new language now requires less wiring code, as many language declarations were merged.

### Fixed

- In C and C++, `if-else` statements without curly braces no longer break the CFG builder (#32)

## [0.0.8] - 2024-10-10

### Added

- Dark-mode and custom color schemes
- Default light/dark mode based on VSCode theme
- Color-scheme creation in the interactive demo
- Documented the color-scheme options

### Fixed

- Nodes for empty blocks now map correctly to the empty block, instead of doing nothing when clicked.

## [0.0.7] - 2024-10-05

### Added

- Clicking a node in the graph now places the cursor on the matching line.
- The demo has a `debug` URL parameter to enable some debug features.

### Changed

- Backlinks are now using the `dir=back` DOT attribute to improve graph layouts.

## [0.0.6] - 2024-09-26

### Added

- The CFG view now highlights (in black) the node matching the cursor position.
- Basic CFG caching for tests, making them twice as fast.
- The extension learned to only generate a CFG on code or config changes.
  If the cursor just moves inside the same function, we don't regenerate the CFG.

### Fixed

- Rendering of `select` blocks in Go was broken.
- Empty case clauses in `switch` statements no longer cause crashes.
- Last case of a Python `match` statement no longer assumed to match.

### Changed

- Massive refactoring of `CFGBuilder` classes.
  New design now uses the same`GenericCFGBuilder` class for all languages,
  and takes statement handlers as arguments.
  This reduces code duplication and makes it easier to add
  new languages in the future.
- Flat switches now generate nodes for the conditions, and not only the consequence.
- The CodeMirror editor in the demo got it's own Svelte component now, `Editor.svelte`.
  This allows better state management and handling/dispatching events.

## [0.0.5] - 2024-09-18

### Added

- Initial support for Python.
- Support for node clusters. This is used heavily in Python, for context-managers and exception-handling.
- A "share" feature to the demo
- A "save SVG" option to the demo

#### Testing

- Enable live-testing with the web viewer. Requires that you run both `bun web-tests --watch` and `bun web` at the same time.
- By default, `bun web` only shows failing tests
- `bun web` color-codes tests to note which are failing
- `bun lint` added `tsc --noEmit`
- DOT output in `bun web` is not pretty-printed, and can be automatically opened in [GraphvizOnline](https://dreampuf.github.io/GraphvizOnline/)

### Fixed

- Switch-like structures in flatSwitch now show an alternative edge from the head to the exit node.
  This was previously missing.
- Thick-backlinks (for loops) are now generated correctly based on loop detection.

## [0.0.4] - 2024-09-10

- Improved comment-test framework to allow writing tests for multiple languages
- Added comment-test in-browser rendering to allow better debugging
- Add basic support for C

## [0.0.3] - 2024-09-07

- Learned Go's `fallthrough` keyword
- Learned an option to draw flat-switches (where all cases are direct descendants of the switch head)
- Added utilities for basic reachability testing
- Expose `simplify` and `flat switch` settings in demo
- Expose `flat switch` setting in extension

## [0.0.2] - 2024-09-06

- Interactive demo website, use `bun demo` to run.
- Publish demo via Github Pages
- Updated readme to point to the demo
- Automatically publish releases

## [0.0.1] - 2024-09-05

### Added

- Basic, complete extension.
