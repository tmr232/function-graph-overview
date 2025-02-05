/*
reach: [["inner", "outer"]]
*/
func ContinueToLabel() {
outer:
	for i := 0; i < 5; i++ {
	    // CFG: outer
		fmt.Println(i)
		for {
		    // CFG: inner
			continue outer
		}
		fmt.Println("Oh no!")
	}
}