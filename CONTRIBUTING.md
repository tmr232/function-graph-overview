# Contributing to Function-Graph-Overview

This project welcomes contributions in the form of Pull Requests.
For clear bug-fixes / typos etc. just submit a PR.
For new features or if there is any doubt in how to fix a bug,
you might want to open an issue prior to starting work to discuss it first.
If you want to add support for a new programming language,
please create an issue for it before starting,
to avoid duplicate work.

For adding a new language, please consult our [guide for adding a new language](./docs/AddNewLanguage.md)
after reading through this page.

## Prerequisites

We use [Bun](https://bun.sh/) to manage the development environment.
This includes package-management, and running local tools.
To begin development, install Bun using the [recommended method](https://bun.sh/docs/installation).

Next, you'll need to create a _fork_ (your own personal copy) of the Function-Graph-Overview repository
and clone that fork on to your local machine.
GitHub offers a great tutorial for this process [here](https://docs.github.com/en/get-started/quickstart/fork-a-repo).
After following this guide, you'll have a local copy of the project installed.

Enter the directory containing your copy of the project (`cd function-graph-overview`).

Bun can now install all the project dependencies:

```shell
bun install
```

### VSCode

If you want to add features to the [VSCode](https://code.visualstudio.com/) extension itself,
you'll want to have VSCode installed.
Additionally, you'll need [Bun for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=oven.bun-vscode) for debugging the extension.
Once you have it installed, you should be able to press `F5` in VSCode launch a debug session for the extension.

## Running Locally

Once you have the repository cloned and all dependencies installed,
you can run the [web version](https://tmr232.github.io/function-graph-overview/) locally by running:

```shell
bun demo
```

This will allow you to see your work as you go, and play with the results.
It also provides a good indication that everything is installed correctly.

## Developing

At this point, you're ready to start developing.
Some things to consider while developing Rich code include:

* Ensure new code is documented in docstrings
* Avoid abbreviations in variable or class names
* Aim for consistency in coding style and API design

Before each [commit](https://github.com/git-guides/git-commit), you should:

1. Run the tests and ensure they pass
2. Format and lint the code

These steps are described in the following sections.

### Tests

Run tests with the following command:

```
bun vitest run
```

New code should ideally have tests and not break existing tests.

For more information, read [Running & Writing Tests](./docs/CommentTests.md).

### Code Formatting & Linting

We use multiple tools to format and lint our code, including automatic fixes by the linters.
To run the tools, use:

```shell
bun lint
```

The command will run both formatting & linting, and stop when a tool detects issues it cannot resolve automatically.
Follow the recommendation in the tool output, and re-run the command once you are done.

We recommend running it frequently as you code to keep the output short and simple.

If you see changes to files you did not edit - try running `bun install` again,
as the linters and the configuration get updated from time to time.


### Update CHANGELOG and CONTRIBUTORS

Before submitting your pull request, update the `CHANGELOG.md` file describing, briefly, what you've done.
Be sure to follow the format seen in the rest of the document.

If this is your first time contributing to Function-Graph-Overview:

1. Welcome!
2. Be sure to add your name to `CONTRIBUTORS.md`.

## Creating A Pull Request

Once your happy with your change and have ensured that all steps above have been followed (and checks have passed),
you can create a pull request.
GitHub offers a guide on how to do this [here](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork).
Please ensure that you include a good description of what your change does in your pull request,
and link it to any relevant issues or discussions.

When you create your pull request, we'll run the checks described earlier.
If they fail, please attempt to fix them as we're unlikely to be able to review your code until then.
If you've exhausted all options on trying to fix a failing check,
feel free to leave a note saying so in the pull request and someone may be able to offer assistance.

### Code Review

After the checks in your pull request pass, someone will review your code.
There may be some discussion and, in most cases, a few iterations will be required to find a solution that works best.

## Afterwards

When the pull request is approved, it will be merged into the `main` branch.
Your change will be immediately available in the [online demo](https://tmr232.github.io/function-graph-overview/),
and will be available in the IDE plugins on the next release.
