/*
exits: 1,
flatNodes: 5,
nodes: 7
*/
function EmptyFallthroughCases() {
  switch (x) {
    case 1:
    case 2:
    case 3:
  }
}

/*
exits: 1,
flatNodes: 6,
nodes: 7,
flatReaches: [["A", "B", "C"]]
*/
function EmptyFallthroughToNonEmpty() {
  switch (x) {
    // CFG: A
    case 1:
    // CFG: B
    case 2:
    // CFG: C
    case 3:
      someFunction();
  }
}