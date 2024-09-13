# nodes: 1,
# exits: 1
def trivial():
    pass

# nodes: 3
def If():
    if x:
        pass
    pass

# nodes: 4
def IfElse():
    if x:
        f()
    else:
        g()
    h()

# nodes: 6
def IfElifElse():
    if x:
        f()
    elif y:
        g()
    else:
        h()
    x()

# nodes: 4,
# exits: 1
def For():
    for x in y:
        pass

# exits: 1
def ForContinue():
    for x in y:
        if x:
            continue
        pass

# exits: 1
def ForBreak():
    for x in y:
        if x:
            break

# exits: 1
def ForElse():
    for x in y:
        pass
    else:
        return 2

# exits: 1
def ForElseBreak():
    for x in y:
        if x:
            break
    else:
        pass

# exits: 2
def ForElseBreakReturn():
    for x in y:
        if x:
            break
    else:
        return

# exits: 1
def While():
    while x:
        pass

# exits: 1
def WhileContinue():
    while x:
        if y:
            continue
        pass

# exits: 1
def WhileBreak():
    while x:
        if y:
            break
        
# exits: 1
def WhileElse():
    while x:
        pass
    else:
        pass

# exits: 1
def WhileElseBreak():
    while x:
        if y:
            break
        pass
    else:
        pass

# exits: 1
def Match():
    match x:
        case 1:
            pass
        case 2:
            pass

# exits: 3
def MatchMultiPattern():
    match x:
        case 1,2,3:
            return
        case 4,5:
            return

# exits: 2
def Return():
    if x:
        return 1
    return 2


# nodes: 7,
# render: true
def WithCluster():
    pass
    with x:
        if f():
            g()
        h()
    with y:
        pass
    pass


# render: true,
# exits: 2
def WithNestedCluster():
    with x:
        if f():
            g()
        h()
    with y:
        if z:
            with z:
                match a:
                    case 1:pass
                    case 2:pass
        else:
            return


# exits: 1,
# render: true
def try_finally():
    try:
        if x:
            return
        pass
    finally:
        pass