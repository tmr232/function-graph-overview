/*
exits: 1,
flatNodes: 7,
nodes: 7
*/
func EmptyFallthroughCases() {
  switch x {
    case 1:
        fallthrough
    case 2:
        fallthrough
    case 3:
  }
}