# DOT Generation

```dot
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
```

```dot-cfg
  
  entry [class="entry"]
  return1 [class="exit"]
  return2 [class="exit"]
  return4_2 [class="exit"]
  entry -> stmt1
  stmt1 -> return1 [class="consequence"]
  stmt1 -> else1 [class="alternative"]
  else1 -> stmt2
  stmt2 -> return2 [class="consequence"]
  stmt2 -> else2 [class="alternative"]
  else2 -> stmt3
  stmt3 -> stmt4_1
  stmt4_1 -> stmt4_2
  stmt4_2 -> return4_2 [class="consequence"]
  stmt4_2 -> else4_2 [class="alternative"]
  else4_2 -> stmt4_3
  stmt4_3 -> stmt4_4
  stmt4_4 -> stmt4_1 [dir="back"]
  
```