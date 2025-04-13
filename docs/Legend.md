---
title: Legend
group: Documents
category: Guides
---

# Graph Legend

## Arrow Types

### Green and Red

Green and red arrows indicate the true and false branches of an `if` or similar structures.

```dot-cfg
IF [label="Condition?"]
THEN [label="True"]
ELSE [label="False"]

IF -> THEN [class=consequence]
IF -> ELSE [class=alternative]
```

### Blue

Blue arrows indicate non-conditional transitions.
These can be `goto`s, or more frequently branches merging after a condition.

```dot-cfg
IF [label="Condition?"]
THEN [label="True"]
ELSE [label="False"]

IF -> THEN [class=consequence]
IF -> ELSE [class=alternative]
ELSE -> MERGE
THEN -> MERGE

A [label="goto x"]
B [label="x"]
A -> B 
```

### Arrow Thickness

Thicker arrow indicate backlinks - going to an earlier line in the code.
Those are most commonly seen in loops.

```dot-cfg
A -> HEAD
HEAD -> BODY [class=consequence]
BODY -> HEAD [dir=back]
HEAD -> EXIT [class=alternative]
```

## Block Types

### Basic

The basic block contains any number of "basic" lines.
Those can be anything from function-calls to variable assignments.
Since they don't affect control flow, they are not indicated directly in the graph.
The taller a block is - the more lines it has in it.

```dot-cfg
subgraph cluster_0 {
    label="Few lines"
    A
}
subgraph cluster_1 {
    label="Many lines"
    B [height=3]
}
```

### Entry & Exit (Return)

The function entry is marked with a green inverted-house block and all exits are marked with red house blocks.

```dot-cfg
A [class=entry]
A -> B
B -> C
C [class=exit]
```

### Yield

`yield` nodes are marked using hexagons.

```dot-cfg
A -> B
B [class=yield]
B -> C
```

### Throw and Raise

`throw` and `raise` nodes are marked using triangles.

```dot-cfg
A -> B
B [class=throw]
```

## Clusters

Clusters are used to describe constructs that cannot be cleanly represented in a pure-graph.


### Context Managers

Context-managers, such as Python's `with` statement, have a simple cluster with a single background color.

```dot-cfg
A -> IF
subgraph cluster_0 {
    class=with
    IF -> THEN [class=consequence]
    IF -> ELSE [class=alternative]
}
THEN -> MERGE
ELSE -> MERGE
```

When nested, they'll have a small border added as well for separation.

```dot-cfg
A -> IF
subgraph cluster_0 {
    class=with
    subgraph cluster_1 {
        class=with
        THEN
    }
    IF -> THEN [class=consequence]
    IF -> ELSE [class=alternative]
}
THEN -> MERGE
ELSE -> MERGE
```


### Exception Handling

Exceptions have somewhat complex clusters.

- The entire try-except-else-finally clause is surrounded by a blue cluster, indicating the context;
- the `try` block is placed in a green cluster;
- all `except` or `catch` blocks are given red clusters;
- the `else` block, if present, is give no additional cluster;
- `finally` blocks are given yellow clusters.
  `finally` blocks are replicated for every flow that requires them.
  This usually means `return` statements inside the `try` or `except` blocks.

```dot-cfg
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
```