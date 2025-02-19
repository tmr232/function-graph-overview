/* exits: 1 */
func EmptyFallthroughCases() {
  switch x {
    case 1:
        fallthrough
    case 2:
        fallthrough
    case 3:
      return;
  }
}