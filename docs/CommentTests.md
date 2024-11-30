---
title: Running & Writing Tests
group: Documents
category: Guides
---

# Comment Tests

The comment-tests framework allows us to define CFG generation tests in the source-code that we test on.
This makes test-writing easier, as we don't need to include code as strings in our tests.

## Running Tests

Use `bun test` to run all the tests.

### Visualizing Failures

If you have failing tests, you might want to visualize them.
To do that, collect the test results as they get updated:

```shell
bun web-tests --watch
```

And run the web server to visualize them:

```shell
bun web
```

## Test Types

The current available test types are:

1. `nodes`: asserts the expected node-count in the CFG
2. `exits`: asserts the expected exit-node count in the CFG
3. `reaches`: asserts reachability between node pairs
4. `render`: asserts that the code CFG for ths code renders successfully

Additionally, code-segmentation and snapshot-tests are added automatically for the code used in comment-tests.

## Writing Tests

1. Write your code in a new function in the matching file under `src/test/commentTestSamples`
2. Add a comment right above the function, declaring the relevant tests.
   The commend format is JSON, but without the curly braces.

## Adding Languages

When we add a new language, we need to add a test-collector for that language.
A test collector exports a `getTestFuncs(code: string): Generator<TestFunction>` function.
To do that, we need to parse the code, and extract all functions and comments inside it.
It's best to look at one of the `collect-<language>.ts` files to see how this is done.

Once we have a collector, we add it in `src/test/commentTestCollector.ts` and map file-extensions to use with it.
Then, we add a test file under `src/test/commentTestSamples`.
