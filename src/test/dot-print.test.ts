import { describe, expect, test } from "bun:test";

import { getLightColorScheme } from "../control-flow/colors.ts";
import { applyTheme } from "../dot-cfg/dot-print.ts";

describe("Theme DOT-CFG Samples", async () => {
  test("Theme CFG", () => {
    const result = applyTheme(
      `
      digraph {
          entry [class="entry"]
          return1 [class="exit"]
          return2 [class="exit"]
          return4_2 [class="exit"]
          stmt2 [height=2]
          stmt3 [height=2]
          entry -> stmt1
          stmt1 -> return1 [class="consequence"]
          stmt1 -> stmt2 [class="alternative"]
          stmt2 -> return2 [class="consequence"]
          stmt2 -> stmt3 [class="alternative"]
          stmt3 -> stmt4_1
          stmt4_1 -> stmt4_2
          stmt4_2 -> return4_2 [class="consequence"]
          stmt4_2 -> stmt4_4 [class="alternative"]
          stmt4_4 -> stmt4_1 [dir="back"]
          stmt4_4 [height=3]
      }
      `,
      getLightColorScheme(),
    );
    expect(result).toMatchSnapshot();
  });

  test("Theme CFG with clusters", () => {
    const result = applyTheme(
      `
      digraph {
          subgraph cluster_tryComplex {
              class=tryComplex
              subgraph cluster_try {
                  class=try
                  TRY [label=try]
              }
              subgraph cluster_except {
                  class=except
                  EXCEPT [label="except/catch"]
              }
              subgraph cluster_else {
                  ELSE [label=else]
              }
              subgraph cluster_finally {
                  class=finally
                  FINALLY [label=finally]
              }
          }
          ENTRY -> TRY
          TRY -> EXCEPT [class=exception]
          TRY -> ELSE
          ELSE -> FINALLY
          EXCEPT -> FINALLY
          FINALLY -> EXIT
      }
    `,
      getLightColorScheme(),
    );
    expect(result).toMatchSnapshot();
  });
});
