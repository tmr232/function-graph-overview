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


# render: true,
# exits: 999
def raise_exception():
    raise

# render: true
def raise_again():
    try:
        raise x
    except: 
        if x:
            pass
    else: 
        if x:
            pass

# render: true,
# exits: 3
def yield_value():
    for x in y:
        yield x
    

# exits: 2,
# nodes: 4,
# render: true
def try_except():
    try:
        f()
    except:
        g()
    return

# exits: 1,
# nodes: 5,
# render: true
def try_except_finally():
    try:
        f()
    except:
        g()
    finally:
        h()
    return

# exits: 2,
# nodes: 9,
# render: true
def try_many_except_finally():
    try:
        f()
    except a:
        g()
    except b:
        aa()
    except: return
    finally:
        h()
    return


# exits: 1,
# nodes: 6,
# render: true
def try_except_else_finally():
    try: pass
    except: pass
    else: pass
    finally: pass

# render: true
def massive_try_except_else_finally():
    try: 
        try: pass
        except: pass
        else: pass
        finally: pass
    except:
        try: pass
        except: pass
        else: pass
        finally: pass
    else: 
        if x:
            pass
        else:
            pass
        try:
            pass
        finally: pass
    finally: 
        with x:
            for y in a:
                pass

# exits: 2,
# nodes: 8,
# render: true
def try_finally():
    try:
        if x:
            return
        pass
    finally:
        pass

# exits: 1,
# nodes: 5,
# render: true
def try_with_finally():
    try:
        with x:
            return
        pass
    finally:
        pass

