# nodes: 1,
# exits: 1
def trivial():
    pass

# nodes: 3
def If():
    if x:
        pass
    pass

# nodes: 5
def IfElse():
    if x:
        pass
    else:
        pass

# nodes: 7
def IfElifElse():
    if x:
        pass
    elif y:
        pass
    else:
        pass

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
        return

# exits: 1
def ForElseBreak():
    for x in y:
        if x:
            break
    else:
        pass

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

# exits: 2
def Return():
    if x:
        return 1
    return 2


