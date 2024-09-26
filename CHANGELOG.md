# Change Log

All notable changes to the "function-graph-overview" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added

- The CFG view now highlights (in black) the node matching the cursor position.

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
