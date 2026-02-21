class Sample {
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
    exits: 1
    */
    void ForLoops() {
        for (a(); b(); c()) { if (x) break;}
        for (a(); b();    ) { if (x) break;}
        for (a();    ; c()) { if (x) break;}
        for (a();    ;    ) { if (x) break;}
        for (   ; b(); c()) { if (x) break;}
        for (   ; b();    ) { if (x) break;}
        for (   ;    ; c()) { if (x) break;}
        for (   ;    ;    ) { if (x) break;}
    }

    /*
    exits: 1
    */
    void MoreSwitch() {
        switch (x) {
            case 1: break;
            case 2: break;
            case 3: f();
            case 4: break;
            default: f();
        }
    }

    /*
    exits: 1
    */
    void ForEachLoop() {
        for (int item : items) {
        }
    }

    /*
    exits: 1
    */
    void ForEachLoopBreak() {
        for (int item : items) {
            break;
        }
    }

    /*
    exits: 2
    */
    void ForEachLoopReturn() {
        for (int item : items) {
            return;
        }
    }

    /*
    exits: 1
    */
    void TryCatch() {
        try {
            risky();
        } catch (Exception e) {
            handle();
        }
    }

    /*
    exits: 1
    */
    void TryCatchFinally() {
        try {
            risky();
        } catch (Exception e) {
            handle();
        } finally {
            cleanup();
        }
    }

    /*
    exits: 1
    */
    void LabeledStatement() {
        String str = "";

        loop1: for (int i = 0; i < 5; i++) {
            if (i == 1) {
                continue loop1;
            }
            str = str + i;
        }
    }

    /*
    unreach: [["SOURCE","UNREACH"]]
    */
    void LabelledStatementFlow() {
        loop1: for (int item : items) {
            for (;;) {
                // CFG: SOURCE
                break loop1;
            }
            // CFG: UNREACH
            unreachable_from_inner_loop();
        }
    }

    /*
    exits: 2,
    render: true
    */
    void ThrowStatement() {
        if (x) {
            throw new RuntimeException("error");
        }
    }

    /*
    exits: 1,
    render: true
    */
    void ArrowSwitch() {
        switch (x) {
            case 1 -> f();
            case 2 -> g();
            default -> h();
        }
    }

    /*
    exits: 1,
    render: true
    */
    void ArrowSwitchMultiLabel() {
        switch (x) {
            case 1, 2 -> f();
            case 3 -> g();
            default -> h();
        }
    }

    /*
    exits: 1,
    render: true
    */
    void MultipleCatchClauses() {
        try {
            risky();
        } catch (IOException e) {
            handleIO();
        } catch (Exception e) {
            handleGeneral();
        }
    }

    /*
    exits: 1,
    render: true
    */
    void TryWithResources() {
        try (Resource r = open()) {
            use(r);
        } catch (Exception e) {
            handle();
        }
    }

    /*
    render: true
    */
    void NestedTryCatchFinally() {
        try {
            try {
                risky();
            } catch (Exception inner) {
                handleInner();
            }
        } catch (Exception outer) {
            handleOuter();
        } finally {
            cleanup();
        }
    }

    /*
    exits: 2,
    render: true
    */
    void ReturnInsideTryFinally() {
        try {
            if (x) {
                return;
            }
            f();
        } finally {
            cleanup();
        }
    }

    /*
    nodes: 7
    */
    void IfWithoutBraces() {
        for (;;) {
            if (x) break;
        }
        for (;;) {
            if (x) {
                break;
            }
        }
    }

    /*
    exits: 2,
    render: true
    */
    void SynchronizedBlock() {
        synchronized (lock) {
            if (x) {
                return;
            }
            f();
        }
    }

    /*
    exits: 2,
    render: true
    */
    void AssertStatement() {
        assert x != null;
        f();
    }

    /*
    exits: 1,
    render: true
    */
    void SwitchWithDefault() {
        switch (x) {
            case 1:
                f();
                break;
            case 2:
                g();
                break;
            default:
                h();
                break;
        }
    }

    /*
    exits: 1,
    render: true
    */
    void TryWithResourcesFinally() {
        try (Resource r = open()) {
            use(r);
        } catch (Exception e) {
            handle();
        } finally {
            cleanup();
        }
    }

    /*
    exits: 1,
    render: true
    */
    void SynchronizedSimple() {
        synchronized (lock) {
            f();
            g();
        }
    }
}
