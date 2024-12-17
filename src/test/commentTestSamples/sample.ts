/*
exits: 1,
nodes: 6
 */
function IfStatement() {
  if (x) {
  } else if (x) {
  } else {
  }
}

/*
exits: 1
*/
function ForOfLoop() {
  for (const x of xs) {
  }
}

/*
exits: 1
 */
function ForOfLoopBreak() {
  for (const x of xs) {
    break;
  }
}

/*
exits: 2
 */
function ForOfLoopReturn() {
  for (const x of xs) {
    return;
  }
}

/*
exits: 1
 */
function ForInLoop() {
  for (const x in xs) {
  }
}

/*
exits: 1
 */
function ForLoops() {
  for (a; b; c) { if (x) break;}
  for (a; b;  ) { if (x) break;}
  for (a;  ; c) { if (x) break;}
  for (a;  ;  ) { if (x) break;}
  for ( ; b; c) { if (x) break;}
  for ( ; b;  ) { if (x) break;}
  for ( ;  ; c) { if (x) break;}
  for ( ;  ;  ) { if (x) break;}
}

/*
exits: 1
 */
function ForLoopConditionalBreak() {
  for (const x of y) {
    if (x === 1) {
      break;
    }
  }
}

/*
exits: 1
 */
function ForLoopConditionalContinue() {
  for (const x of y) {
    if (x === 1) {
      continue;
    }
    if (x) {
    }
  }
}

/*
exits: 1
*/
function MoreSwitch() {
  // This is mostly here to test code segmentation and mapping to CFG nodes
  switch (x) {
    case 1:
      break;
    case 2:
      break;
    case 3:
      f();
    case 4:
      break;
    default:
      f();
  }
}

/*
nodes: 1
*/
function trivial() {}

/*
nodes: 3
*/
function simpleIf() {
  if (x) {
  }
}

/*
nodes: 6,
exits: 1
*/
function ifElse() {
  if (x) {
  } else if (y) {
  } else {
  }
}

/*
nodes: 2,
exits: 0
*/
function forever() {
  for (;;) {}
}

/*
nodes: 2,
exits: 0
*/
function forever2() {
  for (let a = 0; ; ++a) {}
}

/*
nodes: 4,
exits: 1,
reaches: [["a","b"],["b","a"]]
*/
function forLoop() {
  for (let a = 0; a < 10; ++a) {
    // CFG: a
    // CFG: b
  }
}

/*
nodes: 4,
exits: 1
*/
function whileLoop() {
  while (x()) {}
}

/*
nodes: 3,
exits: 1
*/
function doWhile() {
  do {} while (x());
}

/*
nodes: 7,
exits: 1,
reaches: [["1","3"]]
*/
function switch_1() {
  switch (x) {
    case 1:
      // CFG: 1
      ("include me!");
    case 2:
    case 3:
      // CFG: 3
      ("Include me!");
  }
}

/*
nodes: 7,
exits: 1
*/
function switch_2() {
  switch (x) {
    case 1:
      break;
    case 2:
    case 3:
  }
}

/*
nodes: 15,
exits: 1
*/
function ManyIfs() {
  if (x) {
  }

  if (x) {
  } else {
  }

  if (x) {
  } else if (x) {
  }

  if (x) {
  } else if (x) {
  } else {
  }
}

/*
nodes: 7
*/
function IfWithoutBraces() {
  /*
  It's important to make sure the braces in the if-query are optional.
  So the following two loops should behave identically.
  */
  for (;;) {
    if (x) break;
  }

  for (;;) {
    if (x) {
      break;
    }
  }
}



function LabeledStatement() {
  let str = '';

  loop1: for (let i = 0; i < 5; i++) {
    if (i === 1) {
      continue loop1;
    }
    str = str + i;
  }

}