func basicSwitchTest() {
	switch x {
		// Who cares?
	case 1:
		// CFG: a
		fallthrough
	case 2:
	case 3:
	}
}