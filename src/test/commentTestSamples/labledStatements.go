
/*
unreach: [["SOURCE","UNREACH"]]
*/
func LabelledStatementFlow() {
  loop1: for x := range xs {
    for ;; {
      // CFG: SOURCE
      break loop1
    }
    // CFG: UNREACH
    unreachable_from_inner_loop()
  }
}

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