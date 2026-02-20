class Sample {
    /*
    nodes: 1
    */
    void Trivial() {}

    /*
    nodes: 3
    */
    void SimpleIf() {
        if (x) {
        }
    }

    /*
    nodes: 6,
    exits: 1
    */
    void IfElse() {
        if (x) {
        } else if (y) {
        } else {
        }
    }

    /*
    nodes: 2,
    exits: 0
    */
    void Forever() {
        for (;;) {
        }
    }

    /*
    nodes: 4,
    exits: 1,
    reaches: [["a","b"],["b","a"]]
    */
    void ForLoop() {
        for (int a = 0; a < 10; ++a) {
            // CFG: a
            // CFG: b
        }
    }

    /*
    nodes: 4,
    exits: 1
    */
    void ForeachLoop() {
        foreach (var item in items) {
        }
    }

    /*
    nodes: 4,
    exits: 1
    */
    void WhileLoop() {
        while (x()) {
        }
    }

    /*
    nodes: 3,
    exits: 1
    */
    void DoWhile() {
        do {
        } while (x());
    }

    /*
    nodes: 7,
    exits: 1
    */
    void Switch1() {
        switch (x) {
            case 1:
                Console.WriteLine("one");
                break;
            case 2:
            case 3:
                Console.WriteLine("two or three");
                break;
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
    nodes: 1,
    exits: 1
    */
    void SimpleReturn() {
        return;
    }

    /*
    nodes: 2,
    exits: 1
    */
    void SimpleThrow() {
        throw new Exception();
    }

    /*
    render: true
    */
    void TryCatch() {
        try {
            DoSomething();
        } catch (Exception e) {
            HandleError(e);
        }
    }

    /*
    render: true
    */
    void TryCatchFinally() {
        try {
            DoSomething();
        } catch (Exception e) {
            HandleError(e);
        } finally {
            Cleanup();
        }
    }

    /*
    nodes: 3,
    exits: 1
    */
    void BreakInLoop() {
        while (true) {
            break;
        }
    }

    /*
    nodes: 6,
    exits: 1
    */
    void ContinueInLoop() {
        while (x()) {
            if (y) {
                continue;
            }
        }
    }
}
