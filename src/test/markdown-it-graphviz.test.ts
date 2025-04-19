import { describe, expect, test } from "bun:test";

import MarkdownIt from "markdown-it";
import { GraphvizDotPlugin } from "../markdown-it-graphviz/plugin.ts";

describe("Render DOT Samples", () => {
  const md = new MarkdownIt().use(GraphvizDotPlugin);

  test("Render DOT", () => {
    const result = md.render(
      `
Here's a DOT snippet!
\`\`\`dot
digraph G {

  subgraph cluster_0 {
    style=filled;
    color=lightgrey;
    node [style=filled,color=white];
    a0 -> a1 -> a2 -> a3;
    label = "process #1";
  }

  subgraph cluster_1 {
    node [style=filled];
    b0 -> b1 -> b2 -> b3;
    label = "process #2";
    color=blue
  }
  start -> a0;
  start -> b0;
  a1 -> b3;
  b2 -> a3;
  a3 -> a0;
  a3 -> end;
  b3 -> end;

  start [shape=Mdiamond];
  end [shape=Msquare];
}
\`\`\`
`,
    );
    expect(result).toMatchSnapshot();
  });
});

describe("Render DOT-CFG Samples", async () => {
  const md = new MarkdownIt().use(await GraphvizDotPlugin(), {
    darkMode: true,
  });

  test("Render CFG", () => {
    const result = md.render(
      `
\`\`\`dot-cfg
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
\`\`\`
`,
    );
    expect(result).toMatchSnapshot();
  });

  test("Render CFG with clusters", () => {
    const result = md.render(
      `
\`\`\`dot-cfg
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
\`\`\`
`,
    );
    expect(result).toMatchSnapshot();
  });
});
