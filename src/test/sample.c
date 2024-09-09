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