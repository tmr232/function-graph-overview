func anotherLabelTest() {
	switch x {
	case 1:
	case 2:
		goto label
	case 3:
	case 4:
	}
	return

label:
	if x {
		f()
	} else {
		g()
	}
}
