import type { Node as SyntaxNode } from "web-tree-sitter";
import type { BasicBlock } from "./cfg-defs.ts";
import type { Context } from "./generic-cfg-builder.ts";
import { matchWildcard } from "./wildcard.ts";
export type Is = "TERMINATE" | "ASSERT";
export type CallHandler = {
  pattern: string;
  is: Is;
};

function matchHandler(
  functionName: string,
  handlers: CallHandler[],
): Is | undefined {
  return handlers.find(({ pattern }) => matchWildcard(pattern, functionName))
    ?.is;
}

export function callProcessorFactory(handlers: CallHandler[]) {
  return (
    node: SyntaxNode,
    functionName: string,
    ctx: Context,
  ): BasicBlock | undefined => {
    switch (matchHandler(functionName, handlers)) {
      case "TERMINATE": {
        const terminateNode = ctx.builder.addNode(
          "EXIT_PROCESS",
          `Call to ${functionName}`,
          node.startIndex,
        );
        return {
          entry: terminateNode,
          exit: null,
          functionExits: [terminateNode],
        };
      }
      case "ASSERT": {
        const conditionNode = ctx.builder.addNode(
          "ASSERT_CONDITION",
          `Assert from: ${functionName}`,
          node.startIndex,
        );
        const raiseNode = ctx.builder.addNode(
          "THROW",
          `Assert from: ${functionName}`,
          node.startIndex,
        );
        const happyNode = ctx.builder.addNode(
          "MERGE",
          "Assert successful",
          node.startIndex,
        );

        ctx.builder.addEdge(conditionNode, raiseNode, "alternative");
        ctx.builder.addEdge(conditionNode, happyNode, "consequence");

        return {
          entry: conditionNode,
          exit: happyNode,
          functionExits: [raiseNode],
        };
      }
      default:
        return undefined;
    }
  };
}
