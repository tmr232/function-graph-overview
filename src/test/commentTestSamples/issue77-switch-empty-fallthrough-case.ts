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
flatNodes: 5,
nodes: 7
*/
function EmptyFallthroughToNonEmpty() {
  switch (x) {
    case 1:
    case 2:
    case 3:
      someFunction();
  }
}