# nodes: 4,
# exits: 1
def raise_and_finally():
    try:
        raise RuntimeError()
    finally:
        print("Oh no!")