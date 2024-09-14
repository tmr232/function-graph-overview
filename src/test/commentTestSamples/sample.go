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
nodes: 1,
reaches: [
	["a", "b"]
]
*/
func trivialReachability() {
	// CFG: a
	// CFG: b
}

/*
reaches: [
	["A", "B"]
]
*/
func hasFallthrough() {
	switch 1 {
	case 1:
		// CFG: A
		fallthrough
	case 2:
		// CFG: B
		"Include me!"
	}
}

/*
exits: 0
*/
func forever() {
	for {
	}
}

/*
exits: 1
*/
func forCond() {
	for x == 1 {
	}
}

/*
exits: 1
*/
func forCStyle() {
	for a := 1; a < 2; a += 1 {
	}
}

/*
exits: 1
*/
func forRange() {
	for a := range b {
	}
}

/*
exits: 1
*/
func typeSwitch() {
	switch v.(type) {
	case int:
	case bool:
	}
}
