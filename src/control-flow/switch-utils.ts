import type { Parser } from "web-tree-sitter";
import type { Case, EdgeType } from "./cfg-defs";
import type { Context } from "./generic-cfg-builder";
import { pairwise } from "./itertools.ts";
export interface SwitchOptions {
  /// A Go `select` blocks until one of the branches matches.
  /// This means that we never add an alternative edge from the
  /// head to the merge node. There is no implicit-default.
  noImplicitDefault?: boolean;
}

export function buildSwitch(
  cases: Case[],
  mergeNode: string,
  switchHeadNode: string,
  options: SwitchOptions,
  ctx: Context,
) {
  let fallthrough: string | null = null;
  let previous: string | null = switchHeadNode;
  for (const thisCase of cases) {
    if (ctx.options.flatSwitch) {
      ctx.builder.addEdge(switchHeadNode, thisCase.conditionEntry);
      ctx.builder.addEdge(thisCase.conditionExit, thisCase.consequenceEntry);
      if (fallthrough) {
        ctx.builder.addEdge(fallthrough, thisCase.consequenceEntry);
      }
      if (thisCase.isDefault) {
        // If we have any default node - then we don't connect the head to the merge node.
        previous = null;
      }
    } else {
      if (fallthrough) {
        ctx.builder.addEdge(fallthrough, thisCase.consequenceEntry);
      }
      if (previous && thisCase.conditionEntry) {
        ctx.builder.addEdge(
          previous,
          thisCase.conditionEntry,
          "alternative" as EdgeType,
        );
      }

      if (thisCase.conditionExit)
        ctx.builder.addEdge(
          thisCase.conditionExit,
          thisCase.consequenceEntry,
          "consequence",
        );

      // Update for next case
      previous = thisCase.isDefault ? null : thisCase.alternativeExit;
    }

    // Fallthrough is the same for both flat and non-flat layouts.
    if (!thisCase.hasFallthrough && thisCase.consequenceExit) {
      ctx.builder.addEdge(thisCase.consequenceExit, mergeNode, "regular");
    }
    // Update for next case
    fallthrough = thisCase.hasFallthrough ? thisCase.consequenceExit : null;
  }
  // Connect the last node to the merge node.
  // No need to handle `fallthrough` here as it is not allowed for the last case.
  if (previous && !options.noImplicitDefault) {
    ctx.builder.addEdge(previous, mergeNode, "alternative");
  }

  if (fallthrough) {
    ctx.builder.addEdge(fallthrough, mergeNode, "regular");
  }
}

export type CaseCollectionCallbacks = {
  getCases(switchSyntax: Parser.SyntaxNode): Parser.SyntaxNode[];
  parseCase(caseSyntax: Parser.SyntaxNode): {
    isDefault: boolean;
    consequence: Parser.SyntaxNode[];
    hasFallthrough: boolean;
  };
};
export function collectCases(
  switchSyntax: Parser.SyntaxNode,
  ctx: Context,
  callbacks: CaseCollectionCallbacks,
): Case[] {
  const cases: Case[] = [];
  const caseSyntaxMany = callbacks.getCases(switchSyntax);

  for (const [prev, curr] of pairwise(caseSyntaxMany)) {
    ctx.link.offsetToSyntax(prev, curr);
  }
  for (const caseSyntax of caseSyntaxMany) {
    const { consequence, isDefault, hasFallthrough } =
      callbacks.parseCase(caseSyntax);

    const conditionNode = ctx.builder.addNode(
      "CASE_CONDITION",
      isDefault ? "default" : (caseSyntax.firstNamedChild?.text ?? ""),
      caseSyntax.startIndex,
    );
    ctx.link.syntaxToNode(caseSyntax, conditionNode);

    const consequenceBlock = ctx.state.update(
      ctx.dispatch.many(consequence, caseSyntax),
    );
    if (consequence.length > 0) {
      ctx.link.offsetToSyntax(
        ctx.matcher
          .match(caseSyntax, `(_ (":") @colon)`, { maxStartDepth: 1 })
          .requireSyntax("colon"),
        // @ts-expect-error: We know there's at least one element
        consequence[0],
      );
    }

    cases.push({
      conditionEntry: conditionNode,
      conditionExit: conditionNode,
      consequenceEntry: consequenceBlock.entry,
      consequenceExit: consequenceBlock.exit,
      alternativeExit: conditionNode,
      hasFallthrough,
      isDefault,
    });
  }

  return cases;
}
