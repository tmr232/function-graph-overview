# Change Log

All notable changes to the "function-graph-overview" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Language Support

- Add initial support for Python

### Visualization

- Add support for node clusters. This is used heavily in Python, for context-managers and exception-handling.

### Demo

- Add Python support
- Add sharing - click the "Share" button to get a sharable link to what you currently see

### Testing

- Enable live-testing with the web viewer. Requires that you run both `bun web-tests --watch` and `bun web` at the same time.
- By default, `bun web` only shows failing tests
- `bun web` color-codes tests to note which are failing

### Extension

- No changes

### Known Issues

- Backlinks are no longer thicker than normal links. That said, they were half-broken to begin with and were somewhat arbitrary.

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
