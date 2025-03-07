import type Parser from "web-tree-sitter";
import type { EdgeType } from "./cfg-defs";
import type { Context } from "./generic-cfg-builder";
import { pairwise } from "./itertools.ts";

export interface SwitchOptions {
  /// A Go `select` blocks until one of the branches matches.
  /// This means that we never add an alternative edge from the
  /// head to the merge node. There is no implicit-default.
  noImplicitDefault?: boolean;
}

/**
 * Represents a single case inside a switch statement.
 *
 * Cases are build of a condition and a consequence,
 * where the condition _may_ lead to the consequence.
 */
export interface Case {
  /**
   * The condition entry node
   */
  conditionEntry: string;
  /**
   * The condition exit node
   */
  conditionExit: string;
  consequenceEntry: string;
  consequenceExit: string | null;
  alternativeExit: string;
  /**
   * Does this case fall-through to the next one?
   */
  hasFallthrough: boolean;
  /**
   * Is this the default case?
   */
  isDefault: boolean;
  /**
   * A case may be entirely empty
   */
  isEmpty: boolean;
}

export function buildSwitch(
  cases: Case[],
  mergeNode: string,
  switchHeadNode: string,
  options: SwitchOptions,
  ctx: Context,
) {
  // Fallthrough from the previous case
  let fallthrough: string | null = null;
  let hasDefaultCase = false;
  let previous: string | null = switchHeadNode;
  for (const thisCase of cases) {
    if (ctx.options.flatSwitch) {
      ctx.builder.addEdge(switchHeadNode, thisCase.conditionEntry);

      if (thisCase.isEmpty && thisCase.hasFallthrough) {
        // When we have an empty fallthrough case, we ignore its consequence node.
        // Instead, we link it directly to the condition node of the next case.
        // This allows for nice chaining while avoiding the tree-like artifacts
        // found in https://github.com/tmr232/function-graph-overview/issues/77
        if (fallthrough) {
          ctx.builder.addEdge(fallthrough, thisCase.conditionEntry);
        }
        fallthrough = thisCase.conditionExit;
      } else {
        ctx.builder.addEdge(thisCase.conditionExit, thisCase.consequenceEntry);

        if (fallthrough) {
          ctx.builder.addEdge(fallthrough, thisCase.conditionEntry);
        }

        if (!thisCase.hasFallthrough && thisCase.consequenceExit) {
          ctx.builder.addEdge(thisCase.consequenceExit, mergeNode, "regular");
        }
        // Update for next case
        fallthrough = thisCase.hasFallthrough ? thisCase.consequenceExit : null;
      }
    } else {
      /* Model the switch as an if-elif-else chain */
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

      if (!thisCase.hasFallthrough && thisCase.consequenceExit) {
        ctx.builder.addEdge(thisCase.consequenceExit, mergeNode, "regular");
      }
      // Update for next case
      fallthrough = thisCase.hasFallthrough ? thisCase.consequenceExit : null;
    }

    hasDefaultCase ||= thisCase.isDefault;
  }
  // Connect the last node to the merge node.
  // No need to handle `fallthrough` here as it is not allowed for the last case.
  if (previous && !hasDefaultCase && !options.noImplicitDefault) {
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

    // We want to mark empty nodes, so that we can avoid linking their
    // consequence nodes.
    // It is true that Go's cases are "empty" even if they have a `fallthrough`
    // keyword as their only statement, but we can safely ignore those.
    // That is because a Go switch allows multiple conditions, making
    // the common case of a huge switch with many cases less common.
    // If it comes up in practice - we'll address it.
    const isEmpty = consequence.length === 0;

    cases.push({
      conditionEntry: conditionNode,
      conditionExit: conditionNode,
      consequenceEntry: consequenceBlock.entry,
      consequenceExit: consequenceBlock.exit,
      alternativeExit: conditionNode,
      hasFallthrough,
      isDefault,
      isEmpty,
    });
  }

  return cases;
}
