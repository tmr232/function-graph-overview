# nodes: 3,
# exits: 2
def assert_without_message():
    assert x


# nodes: 3,
# exits: 2
def assert_with_message():
    assert x


# nodes: 9,
# exits: 5
def multiple_asserts():
    assert x
    assert x
    assert x
    assert x