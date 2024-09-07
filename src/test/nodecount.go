package main

/*
nodes: 1
*/
func trivial() {
}

/*
nodes: 3
*/
func ifThen() {
	if x {

	}
}

/*
nodes: 9
*/
func Switch() {
	switch x {
	case 1:
	case 2:
	case 3:
	case 4:
	}
}

/*
nodes: 12
*/
func switchAndLabelsAndGoto() {
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

/*
reaches: [["a", "b"]]
*/
func trivialReachability() {
	// CFG: a
	// CFG: b
}
