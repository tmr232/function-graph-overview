func hasGoto() {
	if x {
		goto myCoolLabel
	}
	return
myCoolLabel:
	x = 2
	return
}