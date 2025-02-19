/* exits: 1 */
function EmptyFallthroughCases() {
  switch (x) {
    case 1:
    case 2:
    case 3:
      return;
  }
}