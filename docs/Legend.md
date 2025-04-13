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

### Exception Handling

### Context Managers

