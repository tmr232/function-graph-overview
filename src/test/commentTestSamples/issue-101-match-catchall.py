# flatNodes: 1,
# nodes: 1
def single_match_all_underscore():
    match x:
        case _: pass

# flatNodes: 1,
# nodes: 1
def single_match_all_named():
    match x:
        case match_all: pass

# flatNodes: 4,
# nodes: 6
def with_comment():
    match x:
        case 1: pass
        # Comment!
        case 2: pass

# flatNodes: 4,
# nodes: 4
def stop_after_catchall():
    match x:
        case 1: pass
        case _: pass
        case 2: pass

# flatNodes: 5,
# nodes: 6
def cases_and_catchall():
    match x:
        case 1: pass
        case 2: pass
        case _: pass
