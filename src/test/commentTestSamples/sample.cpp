/*
nodes: 1
*/
void trivial() {}

/*
nodes: 3
*/
void simpleIf() {
    if (x) {
    }
}

/*
nodes: 6,
exits: 1
*/
void ifElse() {
    if (x) {
    } else if (y) {
    } else {
    }
}

/*
nodes: 2,
exits: 0
*/
void forever() {
    for (;;) {
    }
}

/*
nodes: 2,
exits: 0
*/
void forever2() {
    for (int a = 0;; ++a) {
    }
}

/*
nodes: 4,
exits: 1,
reaches: [["a","b"],["b","a"]]
*/
void forLoop() {
    for (int a = 0; a < 10; ++a) {
        // CFG: a
        // CFG: b
    }
}

/*
nodes: 4,
exits: 1
*/
void whileLoop() {
    while (x()) {
    }
}

/*
nodes: 3,
exits: 1
*/
void doWhile() {
    do {
    } while (x());
}

/*
nodes: 4,
exits: 1
*/
void gotoA() {
label:
    if (x) {
        goto label;
    }
}

/*
nodes: 7,
exits: 1,
reaches: [["1","3"]]
*/
void switch_1() {
    switch (x) {
    case 1:
        // CFG: 1
        "include me!";
    case 2:
    case 3:
        // CFG: 3
        "Include me!";
    }
}

/*
nodes: 7,
exits: 1
*/
void switch_2() {
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
void ManyIfs() {
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
void IfWithoutBraces() {
    /*
    It's important to make sure the braces in the if-query are optional.
    So the following two loops should behave identically.
    */
    for (;;) {
        if (x)
            break;
    }

    for (;;) {
        if (x) {
            break;
        }
    }
}

/*
exits: 1
 */
void ForLoops() {
    // clang-format off
    for (a; b; c) { if (x) break;}
    for (a; b;  ) { if (x) break;}
    for (a;  ; c) { if (x) break;}
    for (a;  ;  ) { if (x) break;}
    for ( ; b; c) { if (x) break;}
    for ( ; b;  ) { if (x) break;}
    for ( ;  ; c) { if (x) break;}
    for ( ;  ;  ) { if (x) break;}
    //clang-format on
}

/*
exits: 1
*/
void MoreSwitch() {
    // This is mostly here to test code segmentation and mapping to CFG nodes
    switch (x) {
        case 1: break;
        case 2: break;
        case 3: f();
        case 4: break;
        default: f();
    }
}

/*
exits: 1,
nodes: 4
*/
void Exception() {
    try {
    }
    catch (...) {
    }
}

/*
nodes: 3
*/
void Throw() {
    if (x) {
        throw exc;
    }
}

/*
nodes: 4
*/
void ForRangeLoop() {
    for (auto it : items) {
    }
}