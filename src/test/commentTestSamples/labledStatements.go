
/*
unreach: [["SOURCE","UNREACH"], ["SOURCE", "BEFORE_INNER_LOOP"]]
*/
func LabelledStatementFlow() {
  loop1: for x := range xs {
    // CFG: BEFORE_INNER_LOOP
    for ;; {
      // CFG: SOURCE
      break loop1
    }
    // CFG: UNREACH
    unreachable_from_inner_loop()
  }
}

/*
reaches: [["inner", "outer"]]
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